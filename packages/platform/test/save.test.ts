import {
  BACKUPS_KEPT,
  MemoryBackend,
  ProfileStore,
  SAVE_VERSION,
  WriterLock,
  canonicalJson,
  crc32,
  createProfile,
  decodeBackup,
  decodeProfile,
  encodeProfile,
  normalizeProfile,
  recordClear,
  MIGRATIONS,
  migrate,
  STORY_STAGE1,
  emptyProgress,
} from '../src/index';

const DAY = 86_400_000;

function setup(start = Date.UTC(2026, 10, 4)) {
  let now = start;
  const backend = new MemoryBackend();
  const store = new ProfileStore(backend, '0.10.0', () => now);
  return { backend, store, tick: (ms: number) => (now += ms), now: () => now };
}

test('crc32 matches the IEEE reference value', () => {
  expect(crc32('123456789')).toBe('cbf43926');
  expect(crc32('')).toBe('00000000');
});

test('canonical JSON sorts keys and drops undefined', () => {
  expect(canonicalJson({ b: 1, a: { d: 2, c: undefined, b: [3, { z: 1, y: 2 }] } })).toBe(
    '{"a":{"b":[3,{"y":2,"z":1}],"d":2},"b":1}',
  );
});

test('a profile round-trips through its envelope', () => {
  const p = createProfile('Guo', 'de', 1000);
  p.storyChoices['story.stage3.kael-reunion'] = 'meet_now';
  const r = decodeProfile(encodeProfile(p, 2000));
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.profile).toEqual(normalizeProfile(p));
  expect(r.profile.locale).toBe('de');
  expect(r.version).toBe(SAVE_VERSION);
});

test('the schema has the guardrail records from the start', () => {
  const p = createProfile('A', 'en');
  expect(p.storyChoices).toEqual({});
  expect(p.missions).toEqual({});
  expect(p.runArchive).toEqual([]);
  // M21 (save version 3): the reserved slots are typed records.
  expect(p.museum).toEqual({ unlocked: {}, viewed: [] });
  expect(p.sponsorDossier).toEqual({ unlocked: {} });
  expect(p.research).toEqual({ milestones: {}, inputs: {} });
  expect(p.campaign).toEqual({ completed: [], started: [], whatsNewSeen: [] });
  expect(p.cheats.registryVersion).toBe(1);
});

test('an edited save fails the checksum', () => {
  const text = encodeProfile(createProfile('A', 'en'));
  const edited = text.replace('"name":"A"', '"name":"B"');
  expect(edited).not.toBe(text);
  const r = decodeProfile(edited);
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error).toBe('checksum mismatch');
});

test('a save from a newer game is refused, not damaged', () => {
  const env = JSON.parse(encodeProfile(createProfile('A', 'en')));
  env.version = SAVE_VERSION + 1;
  const r = decodeProfile(JSON.stringify(env));
  expect(r.ok).toBe(false);
});

test('migrations run step by step from the stored version, on a copy', () => {
  MIGRATIONS[0] = (d) => {
    const { title, ...rest } = d as { title: string };
    return { ...rest, name: title };
  };
  try {
    const old = { id: 'p1', title: 'Old' };
    // 0 → 1 (this test's step) → 2 (M11: progress and cheat preferences) → 3 (M21:
    // campaign records, normalized).
    expect(migrate(old, 0)).toMatchObject({
      id: 'p1',
      name: 'Old',
      cheats: { heroPrefs: {} },
      progress: emptyProgress(),
      campaign: { completed: [], started: [], whatsNewSeen: [] },
    });
    expect(old).toEqual({ id: 'p1', title: 'Old' });
    expect(() => migrate(old, -1)).toThrow('no migration from save version -1');
  } finally {
    delete MIGRATIONS[0];
  }
});

test('saving keeps the previous good snapshot; a damaged save falls back to it', async () => {
  const { backend, store, tick } = setup();
  const p = createProfile('Guo', 'en');
  await store.save(p);
  tick(1000);
  p.name = 'Guo 2';
  await store.save(p);
  expect(backend.records.has(`profile.${p.id}.prev`)).toBe(true);
  backend.records.set(`profile.${p.id}`, '{"format":"ffp-profile","version":1,"garbage');
  const r = await store.load(p.id);
  expect(r.recovered).toBe(true);
  expect(r.profile?.name).toBe('Guo');
});

test('one backup per day, the newest five kept', async () => {
  const { store, tick } = setup();
  const p = createProfile('Guo', 'en');
  for (let i = 0; i < 8; i += 1) {
    await store.save(p);
    await store.save(p); // a second save the same day adds no backup
    tick(DAY);
  }
  const backups = await store.backups(p.id);
  expect(backups.length).toBe(BACKUPS_KEPT);
  expect(backups[0]!.day > backups[4]!.day).toBe(true);
  const restored = await store.restoreBackup(backups[4]!.name);
  expect(restored?.id).toBe(p.id);
});

test('guests are never written', async () => {
  const { backend, store } = setup();
  const g = { ...createProfile('Guest', 'en'), guest: true };
  await store.save(g);
  expect(backend.records.size).toBe(0);
});

test('export, preview and merge import never overwrite', async () => {
  const a = setup();
  const p = createProfile('Guo', 'zh-CN');
  recordClear(
    p,
    STORY_STAGE1,
    { grade: 'A', timeFrames: 36000, difficulty: 'medium', heroes: ['mountain'] },
    ['easy', 'medium', 'hard'],
  );
  await a.store.save(p);
  const file = await a.store.exportBackup();
  expect(decodeBackup(file).ok).toBe(true);

  const b = setup();
  const other = createProfile('Lan', 'de');
  await b.store.save(other);
  await b.store.save({ ...p, name: 'Guo on PC 2' });
  const preview = await b.store.previewImport(file);
  expect(preview.ok).toBe(true);
  expect(preview.profiles).toEqual([
    { id: p.id, name: 'Guo', updatedAt: expect.any(Number), exists: true, cleared: 1 },
  ]);
  const res = await b.store.applyImport(file, { mode: 'merge' });
  expect(res.added.length).toBe(1);
  expect(res.added[0]).not.toBe(p.id);
  expect((await b.store.load(p.id)).profile?.name).toBe('Guo on PC 2');
  expect((await b.store.load(res.added[0]!)).profile?.name).toBe('Guo');
  expect((await b.store.recoveries()).length).toBe(1);
});

test('replace import touches only the selected profile and can be undone', async () => {
  const a = setup();
  const p = createProfile('Guo', 'en');
  p.name = 'From backup';
  await a.store.save(p);
  const file = await a.store.exportBackup();

  const b = setup();
  await b.store.save({ ...p, name: 'Local' });
  const res = await b.store.applyImport(file, { mode: 'replace', ids: [p.id] });
  expect(res.replaced).toEqual([p.id]);
  expect((await b.store.load(p.id)).profile?.name).toBe('From backup');
  await b.store.restoreRecovery(res.recovery);
  expect((await b.store.load(p.id)).profile?.name).toBe('Local');
});

test('a damaged backup file is refused', async () => {
  const a = setup();
  await a.store.save(createProfile('Guo', 'en'));
  const file = (await a.store.exportBackup()).replace('Guo', 'Gu0');
  expect((await a.store.previewImport(file)).ok).toBe(false);
  expect((await a.store.previewImport('hello')).ok).toBe(false);
});

test('device record defaults and round-trips', async () => {
  const { store } = setup();
  expect((await store.device()).setupDone).toBe(false);
  await store.saveDevice({
    version: 1,
    setupDone: true,
    lastProfile: 'x',
    locale: 'de',
    uiScale: 125,
  });
  expect(await store.device()).toEqual({
    version: SAVE_VERSION,
    setupDone: true,
    lastProfile: 'x',
    locale: 'de',
    uiScale: 125,
  });
});

test('mission records keep the best grade, time and difficulty', () => {
  const p = createProfile('A', 'en');
  const order = ['easy', 'medium', 'hard'];
  recordClear(
    p,
    STORY_STAGE1,
    { grade: 'B', timeFrames: 50000, difficulty: 'hard', heroes: [] },
    order,
  );
  recordClear(
    p,
    STORY_STAGE1,
    { grade: 'S', timeFrames: 60000, difficulty: 'easy', heroes: [] },
    order,
  );
  expect(p.missions[STORY_STAGE1]).toMatchObject({
    clears: 2,
    bestGrade: 'S',
    bestTimeFrames: 50000,
    highestDifficulty: 'hard',
  });
  expect(p.runArchive.length).toBe(2);
});

test('the writer lock lets one holder write; a second gets read-only', async () => {
  const held = new Set<string>();
  const fake = {
    request: (name: string, _o: unknown, cb: (l: unknown) => Promise<void> | undefined) => {
      if (held.has(name)) return Promise.resolve(cb(null));
      held.add(name);
      const p = cb({ name });
      return Promise.resolve(p).then(() => held.delete(name));
    },
  } as unknown as LockManager;
  const tab1 = new WriterLock(fake);
  const tab2 = new WriterLock(fake);
  expect(await tab1.acquire('p1')).toBe(true);
  expect(await tab2.acquire('p1')).toBe(false);
  tab1.drop();
  await Promise.resolve();
  await Promise.resolve();
  expect(await tab2.acquire('p1')).toBe(true);
  expect(await new WriterLock(undefined).acquire('p1')).toBe(true);
});
