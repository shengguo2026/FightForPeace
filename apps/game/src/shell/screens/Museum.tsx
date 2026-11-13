import { useEffect, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import type { MuseumEntryDef } from '@ffp/sim';
import {
  MUSEUM,
  MUSEUM_SECTIONS,
  STAGE1_ENDING,
  STAGE1_INTRO,
  dossierView,
  markViewed,
  museumSection,
  researchView,
  type MuseumSection,
} from '@ffp/platform';
import { Cinematic } from '../../media/Cinematic';
import { audio } from '../../media/audio';
import { locale, t, type TextId } from '../../text/i18n';
import type { Shell } from '../shell';
import { useNav } from '../hooks';
import { ART, Button, Panel, Screen } from '../ui';

/** M21: the Museum's music choice (the director plays it while the Museum is open). */
export const museumListen = signal<{ cue: string; state: string } | null>(null);

/** Music entries reuse the Stage 1 score's localized cue titles (`music.stage1.N`). */
const MUSIC_ENTRIES = MUSEUM.filter((m) => m.section === 'music').map((m) => m.id);

/** The localized name of a Museum entry. */
export function entryName(e: MuseumEntryDef): string {
  const music = MUSIC_ENTRIES.indexOf(e.id);
  if (music >= 0) return t(`music.stage1.${music + 1}` as TextId);
  return t(`museum.${e.id}.name` as TextId);
}

const CINEMA: Record<string, typeof STAGE1_INTRO> = {
  'cine.stage1.intro': STAGE1_INTRO,
  'cine.stage1.ending': STAGE1_ENDING,
};

/** The ending as the best outcome (the Museum shows the whole story). */
const BEST = { workersFreed: 1, workersTotal: 1, clues: 1, cluesTotal: 1 };

/**
 * M21 Village Museum and Archive (Stage 2 spec §14.2, F&D §9.1): Picture, Cinema, Music,
 * Sound, Collection and Investigation. Pages of a stage that is not open are not shown;
 * locked entries of an open stage are undiscovered and nameless. Opening an entry marks
 * it viewed (a Guest looks but keeps nothing).
 */
export function MuseumScreen({ shell }: { shell: Shell }) {
  void locale.value;
  const p = shell.active.value;
  const [section, setSection] = useState<MuseumSection>('picture');
  const [open, setOpen] = useState<string | null>(null);
  const [cinema, setCinema] = useState<string | null>(null);
  const leave = () => {
    museumListen.value = null;
    shell.go('village');
  };
  useNav(() => (cinema ? setCinema(null) : leave()));
  useEffect(() => () => void (museumListen.value = null), []);
  if (!p) return null;
  const s = p.settings;
  if (cinema) {
    const def = CINEMA[cinema];
    if (def)
      return (
        <Cinematic
          def={def}
          state={BEST}
          stills={s.cinematics === 'stills'}
          speakerLabels={s.speakerLabels}
          ctx={shell.lab.players.value[0]!.ctx}
          testId="museum-cinema"
          onDone={() => setCinema(null)}
        />
      );
  }
  const entries = section === 'investigation' ? [] : museumSection(p, section);
  const sel = MUSEUM.find((m) => m.id === open);
  const view = (e: MuseumEntryDef) => {
    setOpen(e.id);
    if (!p.guest) shell.update((x) => markViewed(x, e.id));
  };
  return (
    <Screen bg={ART('menu-bg')} dim align="start" testId="museum">
      <div class="ffp-row" style={{ width: '90vw', alignItems: 'flex-start' }}>
        <Panel style={{ width: '520px', maxHeight: '88vh', overflow: 'auto' }}>
          <h1 class="ffp-title">{t('m21.museum')}</h1>
          <div class="ffp-row" style={{ gap: '6px', flexWrap: 'wrap' }}>
            {MUSEUM_SECTIONS.map((sec, i) => (
              <Button
                label={t(`m21.section.${sec}` as TextId)}
                testId={`museum-section-${sec}`}
                mark={section === sec ? '●' : ''}
                autofocus={i === 0}
                onPress={() => {
                  setSection(sec);
                  setOpen(null);
                }}
              />
            ))}
          </div>
          {section !== 'investigation' && entries.length === 0 ? (
            <p data-testid="museum-empty">{t('m21.museumEmpty')}</p>
          ) : null}
          {entries.map(({ def, state, viewed }) =>
            state === 'unlocked' ? (
              <Button
                label={entryName(def)}
                mark={viewed ? '' : t('m21.newMark', { n: 1 })}
                testId={`museum-entry-${def.id}`}
                onPress={() => view(def)}
              />
            ) : (
              <Button
                label={t('m21.undiscovered')}
                disabled
                testId={`museum-locked-${def.id}`}
                onPress={() => {}}
              />
            ),
          )}
          {p.guest ? <p class="ffp-hint">{t('m21.guestMuseum')}</p> : null}
          <Button label={t('common.back')} onPress={leave} testId="museum-back" />
        </Panel>
        <Panel
          style={{
            flex: 1,
            marginLeft: 'auto',
            maxWidth: '620px',
            maxHeight: '88vh',
            overflow: 'auto',
          }}
          testId="museum-detail"
        >
          {section === 'investigation' ? (
            <Investigation shell={shell} />
          ) : sel && sel.section === section ? (
            <EntryDetail e={sel} play={(c) => setCinema(c)} />
          ) : (
            <p>{t(`m21.sectionIntro.${section}` as TextId)}</p>
          )}
        </Panel>
      </div>
    </Screen>
  );
}

function EntryDetail({ e, play }: { e: MuseumEntryDef; play: (cine: string) => void }) {
  const listening = museumListen.value;
  const [cue, state] = e.asset.split(':');
  const on = !!listening && listening.cue === cue && listening.state === state;
  return (
    <div data-testid="museum-entry">
      <h2 style={{ marginTop: 0 }} data-testid="museum-entry-name">
        {entryName(e)}
      </h2>
      {e.section === 'picture' ? (
        <img
          src={ART(e.asset)}
          alt={entryName(e)}
          data-testid="museum-picture"
          style={{ width: '100%', borderRadius: '6px' }}
        />
      ) : null}
      {e.section === 'cinema' ? (
        <>
          <p>{t(`museum.${e.id}.desc` as TextId)}</p>
          <Button
            label={t('m21.play')}
            testId="museum-play"
            autofocus
            onPress={() => play(e.asset)}
          />
        </>
      ) : null}
      {e.section === 'music' ? (
        <Button
          label={on ? t('m21.stop') : t('m21.listen')}
          testId="museum-listen"
          autofocus
          onPress={() =>
            (museumListen.value = on ? null : { cue: cue!, state: state ?? 'explore' })
          }
        />
      ) : null}
      {e.section === 'sound' ? (
        <Button
          label={t('m21.play')}
          testId="museum-sound"
          autofocus
          onPress={() => {
            audio.unlock();
            audio.sfx(e.asset, 'ui');
          }}
        />
      ) : null}
      {e.section === 'collection' ? (
        <>
          <div
            aria-hidden="true"
            style={{
              height: '120px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6b5a3a, #c9a86a)',
              marginBottom: '10px',
            }}
          />
          <p data-testid="museum-collection-desc">{t(`museum.${e.id}.desc` as TextId)}</p>
        </>
      ) : null}
    </div>
  );
}

/** Investigation: the Sponsor Dossier (facts and the current theory) and formula research. */
function Investigation({ shell }: { shell: Shell }) {
  const p = shell.active.value!;
  const d = dossierView(p);
  const r = researchView(p);
  return (
    <div data-testid="museum-investigation">
      <h2 style={{ marginTop: 0 }}>{t('m21.dossierTitle')}</h2>
      {d.facts.length === 0 && !d.theory ? <p>{t('m21.dossierEmpty')}</p> : null}
      {d.facts.length > 0 ? <h3>{t('m21.factsTitle')}</h3> : null}
      {d.facts.map((f) => (
        <p data-testid="dossier-fact">{t(`dossier.${f.id}` as TextId)}</p>
      ))}
      {d.theory ? (
        <>
          <h3>{t('m21.theoryTitle')}</h3>
          <p data-testid="dossier-theory">{t(`dossier.${d.theory.id}` as TextId)}</p>
        </>
      ) : null}
      {r.shown ? (
        <>
          <h2>{t('m21.researchTitle')}</h2>
          <p class="ffp-hint">{t('m21.researchIntro')}</p>
          {r.milestones.map((m) => (
            <p data-testid={`research-${m.id}`}>
              {m.complete ? '✓ ' : '○ '}
              <b>{t(`research.${m.id}.name` as TextId)}</b>
              {' · '}
              {m.complete ? t('m21.milestoneDone') : t('m21.milestoneOpen')}
              <br />
              <span class="ffp-hint">{t(`research.${m.id}.desc` as TextId)}</span>
            </p>
          ))}
          {r.inputs.length > 0 ? <h3>{t('m21.inputsTitle')}</h3> : null}
          {r.inputs.map((i) => (
            <p data-testid="research-input">{t(`research.input.${i}` as TextId)}</p>
          ))}
        </>
      ) : null}
    </div>
  );
}
