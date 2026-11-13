import { can } from '../system/probe';
import {
  AssetRegistry,
  type MusicCommand,
  MusicDirector,
  type SfxCategory,
  SfxMixer,
  STAGE1_MUSIC,
  STAGE2_MUSIC,
} from '@ffp/platform';
import { synthAmbience, synthMusic, synthSfx } from './synth';

/** MP3 encoder delay (LAME: 576 + decoder 529 samples) when a decoder keeps the padding. */
const MP3_DELAY = 1105;

export interface Volumes {
  master: number;
  music: number;
  effects: number;
  voice: number;
  ambience: number;
  interface: number;
}

/**
 * M13 audio engine (Web Audio): buses for music, effects, voice, ambience and interface
 * under one master; the music director's commands scheduled on the audio clock; sound
 * requests through the priority mixer; delivered files from the asset manifest, and
 * synthesized placeholders for every id without one. The context starts on the first
 * user gesture (browsers block audio before it). Presentation only.
 */
export class AudioEngine {
  readonly director = new MusicDirector([...STAGE1_MUSIC, ...STAGE2_MUSIC]);
  readonly mixer = new SfxMixer();
  private ctx: AudioContext | null = null;
  private buses: Record<
    'master' | 'music' | 'duck' | 'sfx' | 'voice' | 'ambience' | 'ui',
    GainNode
  > | null = null;
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private musicNodes = new Map<string, { src: AudioBufferSourceNode; gain: GainNode }>();
  private voices = new Map<number, AudioBufferSourceNode>();
  /** M22: the narration line playing on the voice bus. */
  private line: AudioBufferSourceNode | null = null;
  /** M22: the ambience bed playing now (id and its nodes). */
  private bed: { id: string; src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private bedWant: string | null = null;
  private bedLoading: string | null = null;
  private volumes: Volumes = {
    master: 0.8,
    music: 0.7,
    effects: 0.8,
    voice: 0.8,
    ambience: 0.8,
    interface: 0.8,
  };
  /** Music is held quieter while this is below 1 (pause menu, cinematics with their own sound). */
  private hold = 1;
  /** True while audio is not running yet (the director's commands could not be played). */
  private silent = false;
  /** Everything the engine started (sounds and music), newest last, for tests. */
  readonly played: string[] = [];

  constructor(private readonly assets = new AssetRegistry()) {}

  /** True once the browser allowed audio. */
  get running(): boolean {
    return this.ctx?.state === 'running';
  }

  /** Creates or resumes the context; call from a user gesture. */
  unlock(): void {
    try {
      if (!this.ctx) {
        // M14: without Web Audio the game runs silent (subtitles and visual cues stay).
        const Ctx = can('sound') ? window.AudioContext : undefined;
        if (!Ctx) return;
        this.ctx = new Ctx();
        const g = () => this.ctx!.createGain();
        const b = {
          master: g(),
          music: g(),
          duck: g(),
          sfx: g(),
          voice: g(),
          ambience: g(),
          ui: g(),
        };
        b.master.connect(this.ctx.destination);
        b.duck.connect(b.master);
        b.music.connect(b.duck);
        b.ambience.connect(b.duck);
        b.sfx.connect(b.master);
        b.voice.connect(b.master);
        b.ui.connect(b.master);
        this.buses = b;
        this.applyVolumes();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      // No audio device: every essential cue also has a visual equivalent.
    }
  }

  setVolumes(v: Volumes): void {
    this.volumes = v;
    this.applyVolumes();
  }

  /** Music level multiplier on top of the settings (1 = normal). */
  setHold(level: number): void {
    if (this.hold === level) return;
    this.hold = level;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    const b = this.buses;
    const ctx = this.ctx;
    if (!b || !ctx) return;
    const at = ctx.currentTime;
    const set = (n: GainNode, v: number) => n.gain.setTargetAtTime(v, at, 0.05);
    set(b.master, this.volumes.master);
    set(b.music, this.volumes.music * this.hold);
    set(b.sfx, this.volumes.effects);
    set(b.voice, this.volumes.voice);
    set(b.ambience, this.volumes.ambience);
    set(b.ui, this.volumes.interface);
  }

  /** The video soundtrack level (cinematic clips carry their own ambience). */
  videoVolume(): number {
    return this.volumes.master * this.volumes.music;
  }

  private buffer(
    id: string,
    make: (ctx: AudioContext) => AudioBuffer,
  ): Promise<AudioBuffer | null> {
    let p = this.buffers.get(id);
    if (p) return p;
    const ctx = this.ctx!;
    const file = this.assets.audio(id);
    p = file
      ? fetch(file.url)
          .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
          .then((data) => ctx.decodeAudioData(data))
          .catch(() => make(ctx))
      : Promise.resolve(make(ctx));
    this.buffers.set(id, p);
    return p;
  }

  private musicBuffer(id: string, cueId: string, bars: number): Promise<AudioBuffer | null> {
    const cue = this.director.cue(cueId);
    return this.buffer(id, (ctx) =>
      synthMusic(ctx, id, cue?.bpm ?? 90, cue?.beatsPerBar ?? 4, bars),
    );
  }

  /** Asks for a music cue and state (null: silence). Never throws for unknown ids. */
  music(cue: string | null, state?: string): void {
    try {
      this.director.request(cue, state);
    } catch {
      this.director.request(null);
    }
  }

  /** Executes the director's commands; call every animation frame. */
  tick(nowMs: number): void {
    const cmds = this.director.update(nowMs);
    if (!this.ctx || !this.buses || (this.ctx.state !== 'running' && this.musicNodes.size === 0)) {
      // Before the first key press or click the browser keeps audio off, so the commands
      // are lost; the score that should be playing then starts once audio is allowed.
      this.silent = true;
      return;
    }
    if (this.silent) {
      this.silent = false;
      const now = this.director.playing;
      const st = now ? this.director.cue(now.cue)?.states[now.state] : undefined;
      if (now && st && !st.once && !this.musicNodes.has(now.asset))
        this.run(
          {
            kind: 'start',
            asset: now.asset,
            at: nowMs,
            loop: true,
            fadeMs: 600,
            cue: now.cue,
            state: now.state,
          },
          nowMs,
        );
    }
    for (const c of cmds) this.run(c, nowMs);
  }

  private when(at: number, nowMs: number): number {
    return this.ctx!.currentTime + Math.max(0, (at - nowMs) / 1000);
  }

  private run(c: MusicCommand, nowMs: number): void {
    const ctx = this.ctx!;
    const bus = this.buses!.music;
    if (c.kind === 'stop') {
      const n = this.musicNodes.get(c.asset);
      if (!n) return;
      this.musicNodes.delete(c.asset);
      const t = this.when(c.at, nowMs);
      n.gain.gain.setValueAtTime(n.gain.gain.value, t);
      n.gain.gain.linearRampToValueAtTime(0, t + c.fadeMs / 1000);
      try {
        n.src.stop(t + c.fadeMs / 1000 + 0.05);
      } catch {
        /* already stopped */
      }
      return;
    }
    const playing = this.director.playing;
    const cueId = c.kind === 'start' ? c.cue : (playing?.cue ?? '');
    const def = this.director.cue(cueId);
    const bars =
      c.kind === 'start'
        ? (def?.states[c.state]?.bars ?? 8)
        : (def?.stingers?.find((s) => s.asset === c.asset)?.bars ?? 1);
    const at = this.when(c.at, nowMs);
    const fade = c.kind === 'start' ? c.fadeMs / 1000 : 0;
    const loop = c.kind === 'start' && c.loop;
    this.played.push(c.kind === 'start' ? `music:${c.cue}/${c.state}` : `stinger:${c.asset}`);
    void this.musicBuffer(c.asset, cueId, bars).then((buf) => {
      if (!buf || !this.ctx) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = loop;
      // M22: a delivered loop whose decoder kept the MP3 padding loops on its exact bars.
      const ms = this.assets.audio(c.asset)?.audio.ms;
      if (loop && ms && buf.duration * 1000 > ms + 20) {
        src.loopStart = MP3_DELAY / buf.sampleRate;
        src.loopEnd = src.loopStart + ms / 1000;
      }
      const gain = ctx.createGain();
      const start = Math.max(at, ctx.currentTime);
      gain.gain.setValueAtTime(fade > 0 ? 0 : 1, start);
      if (fade > 0) gain.gain.linearRampToValueAtTime(1, start + fade);
      src.connect(gain).connect(bus);
      src.start(start);
      if (c.kind === 'start') {
        this.musicNodes.get(c.asset)?.src.stop();
        this.musicNodes.set(c.asset, { src, gain });
      }
    });
  }

  /** A sound through the priority mix (returns whether it plays). */
  sfx(id: string, category: SfxCategory, opts: { distance?: number; own?: boolean } = {}): boolean {
    if (!this.ctx || !this.buses || this.ctx.state !== 'running') return false;
    const now = performance.now();
    const ms = 400;
    const d = this.mixer.trigger({ id, category, ms, ...opts }, now);
    if (!d.play) return false;
    if (d.steal !== undefined) {
      try {
        this.voices.get(d.steal)?.stop();
      } catch {
        /* ended */
      }
      this.voices.delete(d.steal);
    }
    if (d.duck) this.duck(d.duck.gain, d.duck.ms);
    this.played.push(`sfx:${id}`);
    const ctx = this.ctx;
    const bus =
      category === 'ui'
        ? this.buses.ui
        : category === 'ambience'
          ? this.buses.ambience
          : this.buses.sfx;
    void this.buffer(id, (c) => synthSfx(c, id)).then((buf) => {
      if (!buf) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = d.gain;
      src.connect(g).connect(bus);
      src.start();
      if (d.voice !== undefined) {
        this.voices.set(d.voice, src);
        src.onended = () => this.voices.delete(d.voice!);
      }
    });
    return true;
  }

  /**
   * M22: a narration or dialogue line from a delivered voice file on the voice bus (the
   * previous line stops); music and ambience dip under it. Returns false when audio is
   * not running or the file is missing.
   */
  voice(asset: string): boolean {
    if (!this.ctx || !this.buses || this.ctx.state !== 'running' || !this.assets.audio(asset))
      return false;
    const ctx = this.ctx;
    const bus = this.buses.voice;
    this.stopVoice();
    this.played.push(`voice:${asset}`);
    void this.buffer(asset, (c) => c.createBuffer(1, 1, 22050)).then((buf) => {
      if (!buf) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(bus);
      src.start();
      this.line = src;
      this.duck(0.55, buf.duration * 1000);
    });
    return true;
  }

  stopVoice(): void {
    try {
      this.line?.stop();
    } catch {
      /* ended */
    }
    this.line = null;
  }

  /**
   * M22: the ambience bed (water circulation, pumps, aeration, night exteriors) on its own
   * bus under the music; null fades it out. A new bed crossfades over 1.5 s. Ids without a
   * delivered file play a synthesized placeholder bed.
   */
  ambience(id: string | null): void {
    this.bedWant = id;
    const ctx = this.ctx;
    const bus = this.buses?.ambience;
    if (!ctx || !bus || ctx.state !== 'running') return;
    if ((this.bed?.id ?? null) === id || (id !== null && this.bedLoading === id)) return;
    const old = this.bed;
    if (old) {
      const t = ctx.currentTime;
      old.gain.gain.setValueAtTime(old.gain.gain.value, t);
      old.gain.gain.linearRampToValueAtTime(0, t + 1.5);
      try {
        old.src.stop(t + 1.6);
      } catch {
        /* ended */
      }
      this.bed = null;
    }
    if (id === null) return;
    this.bedLoading = id;
    this.played.push(`ambience:${id}`);
    void this.buffer(id, (c) => synthAmbience(c, id)).then((buf) => {
      if (this.bedLoading === id) this.bedLoading = null;
      if (!buf || this.bedWant !== id || !this.ctx || this.bed) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const gain = ctx.createGain();
      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(1, t + 1.5);
      src.connect(gain).connect(bus);
      src.start();
      this.bed = { id, src, gain };
    });
  }

  /** The ambience bed asked for now (tests). */
  get ambienceId(): string | null {
    return this.bedWant;
  }

  /** Brief bounded music and ambience duck for an essential cue. */
  duck(gain: number, ms: number): void {
    const b = this.buses;
    const ctx = this.ctx;
    if (!b || !ctx) return;
    const t = ctx.currentTime;
    b.duck.gain.cancelScheduledValues(t);
    b.duck.gain.setTargetAtTime(gain, t, 0.02);
    b.duck.gain.setTargetAtTime(1, t + ms / 1000, 0.12);
  }
}

export const audio = new AudioEngine();
