import { useEffect, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import type { MuseumEntryDef } from '@ffp/sim';
import {
  MUSEUM,
  MUSEUM_SECTIONS,
  STAGE1_ENDING,
  STAGE1_INTRO,
  STAGE1_MUSIC,
  STAGE2_CHAPTERS,
  STAGE2_MUSIC,
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

/** Music entries reuse the score's localized cue titles (the cue's `title`). */
const SCORE = [...STAGE1_MUSIC, ...STAGE2_MUSIC];

/** The localized name of a Museum entry. */
export function entryName(e: MuseumEntryDef): string {
  if (e.section === 'music') {
    const cue = SCORE.find((c) => c.id === e.asset.split(':')[0]);
    if (cue?.title) return t(cue.title as TextId);
  }
  return t(`museum.${e.id}.name` as TextId);
}

const CINEMA: Record<string, typeof STAGE1_INTRO> = {
  'cine.stage1.intro': STAGE1_INTRO,
  'cine.stage1.ending': STAGE1_ENDING,
  ...Object.fromEntries(STAGE2_CHAPTERS.map((c) => [c.id, c])),
};

/** The ending as the best outcome (the Museum shows the whole story). */
const BEST = { workersFreed: 1, workersTotal: 1, clues: 1, cluesTotal: 1, preservation: 0 };

/**
 * M21 Village Museum and Archive (Stage 2 spec §14.2, F&D §9.1): Picture, Cinema, Music,
 * Sound, Collection and Investigation. Pages of a stage that is not open are not shown;
 * locked entries of an open stage are undiscovered and nameless. Opening an entry marks
 * it viewed (a Guest looks but keeps nothing).
 */
export function MuseumScreen({ shell }: { shell: Shell }) {
  void locale.value;
  const p = shell.active.value;
  // Two levels: the section list (null), then one section's entries.
  const [section, setSection] = useState<MuseumSection | null>(null);
  const [last, setLast] = useState<MuseumSection>('picture');
  const [open, setOpen] = useState<string | null>(null);
  const [cinema, setCinema] = useState<string | null>(null);
  const leave = () => {
    museumListen.value = null;
    shell.go('village');
  };
  const toSections = () => {
    setSection(null);
    setOpen(null);
  };
  useNav(() => (cinema ? setCinema(null) : section ? toSections() : leave()));
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
  const entries = !section || section === 'investigation' ? [] : museumSection(p, section);
  const fresh = (sec: MuseumSection) =>
    sec === 'investigation'
      ? 0
      : museumSection(p, sec).filter((x) => x.state === 'unlocked' && !x.viewed).length;
  const sel = MUSEUM.find((m) => m.id === open);
  const view = (e: MuseumEntryDef) => {
    setOpen(e.id);
    if (!p.guest) shell.update((x) => markViewed(x, e.id));
  };
  return (
    <Screen key={section ?? 'sections'} bg={ART('menu-bg')} dim align="start" testId="museum">
      <div class="ffp-row" style={{ width: '90vw', alignItems: 'flex-start' }}>
        <Panel style={{ width: '520px', maxHeight: '88vh', overflow: 'auto' }}>
          <h1 class="ffp-title">
            {section
              ? `${t('m21.museum')} · ${t(`m21.section.${section}` as TextId)}`
              : t('m21.museum')}
          </h1>
          {!section
            ? MUSEUM_SECTIONS.map((sec) => (
                <Button
                  label={t(`m21.section.${sec}` as TextId)}
                  testId={`museum-section-${sec}`}
                  mark={fresh(sec) > 0 ? t('m21.newMark', { n: fresh(sec) }) : ''}
                  autofocus={sec === last}
                  onPress={() => {
                    setSection(sec);
                    setLast(sec);
                    setOpen(null);
                  }}
                />
              ))
            : null}
          {section && section !== 'investigation' && entries.length === 0 ? (
            <p data-testid="museum-empty">{t('m21.museumEmpty')}</p>
          ) : null}
          {entries.map(({ def, state, viewed }, i) =>
            state === 'unlocked' ? (
              <Button
                label={entryName(def)}
                mark={viewed ? '' : t('m21.newMark', { n: 1 })}
                testId={`museum-entry-${def.id}`}
                autofocus={i === 0}
                onFocus={() => setOpen(def.id)}
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
          {section ? (
            <Button
              label={t('m21.allSections')}
              onPress={toSections}
              testId="museum-sections"
              autofocus={section === 'investigation'}
            />
          ) : (
            <Button label={t('common.back')} onPress={leave} testId="museum-back" />
          )}
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
          scrollLabel={t(`m21.section.${section ?? last}` as TextId)}
        >
          {section === 'investigation' ? (
            <Investigation shell={shell} />
          ) : section && sel && sel.section === section ? (
            <EntryDetail e={sel} play={(c) => setCinema(c)} />
          ) : (
            <p>{t(`m21.sectionIntro.${section ?? last}` as TextId)}</p>
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
          <img
            src={ART(`artifact-${e.asset}`)}
            alt={entryName(e)}
            data-testid="museum-collection-art"
            style={{
              display: 'block',
              width: '240px',
              maxWidth: '100%',
              aspectRatio: '1',
              margin: '0 auto 10px',
              borderRadius: '8px',
              background: 'radial-gradient(circle, #c9a86a55, #6b5a3a22 70%)',
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
