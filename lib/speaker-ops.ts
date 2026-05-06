import type { FunnelDoc, FunnelNode, SpeakerOverride } from './funnel-types';
import type { DialogLine } from '@/components/funnel-editor/blocks/DialogBlock';

/**
 * Speaker-Strings, die nicht als globale Sprecher zählen — sie sind
 * platzhalter für den Nutzer (right-Position) oder für den Erzähler
 * (center-Position ohne speaker).
 */
const NON_GLOBAL_SPEAKERS = new Set(['Du', '@vorname', 'Erzähler']);

function isGlobalSpeaker(speaker: string | undefined | null): boolean {
  if (!speaker) return false;
  const trimmed = speaker.trim();
  if (!trimmed) return false;
  return !NON_GLOBAL_SPEAKERS.has(trimmed);
}

/**
 * Sammelt eindeutige speaker-Strings aus den Lines eines einzelnen
 * quest_dialog-Blocks. Reihenfolge entspricht erstem Auftritt.
 */
export function collectSpeakersInBlock(props: { lines?: DialogLine[] } | null | undefined): string[] {
  const lines = props?.lines ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    if (line.position === 'right' || line.position === 'center') continue;
    if (!isGlobalSpeaker(line.speaker)) continue;
    if (seen.has(line.speaker)) continue;
    seen.add(line.speaker);
    out.push(line.speaker);
  }
  return out;
}

/**
 * Walk-Helper: liefert alle Block-Nodes über alle Pages und Layout-Spalten.
 */
function walkBlocks(doc: FunnelDoc, visit: (type: string, props: Record<string, unknown>) => void): void {
  function walk(nodes: FunnelNode[]) {
    for (const n of nodes) {
      if (n.kind === 'block') visit(n.type, n.props as Record<string, unknown>);
      else if (n.kind === 'layout') for (const c of n.columns) walk(c.nodes);
    }
  }
  for (const page of doc.pages) walk(page.nodes);
}

/**
 * Sammelt eindeutige speaker-Strings aller quest_dialog-Blöcke einer Quest.
 * Für globale Übersicht / Validierung.
 */
export function collectAllSpeakersInDoc(doc: FunnelDoc): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  walkBlocks(doc, (type, props) => {
    if (type !== 'quest_dialog') return;
    const lines = (props.lines as DialogLine[] | undefined) ?? [];
    for (const line of lines) {
      if (line.position === 'right' || line.position === 'center') continue;
      if (!isGlobalSpeaker(line.speaker)) continue;
      if (seen.has(line.speaker)) continue;
      seen.add(line.speaker);
      out.push(line.speaker);
    }
  });
  return out;
}

/**
 * Liefert die zur Anzeige zu verwendenden Sprecher-Werte mit Override-Vorrang.
 * Per-Line-Werte (line.avatarUrl) müssen vom Caller separat berücksichtigt
 * werden — diese Funktion adressiert nur die globale Override-Map.
 */
export function resolveSpeaker(
  speakerOverrides: Record<string, SpeakerOverride> | undefined,
  speaker: string,
): { displayName: string; avatarUrl?: string } {
  const override = speakerOverrides?.[speaker];
  const displayName = override?.displayName?.trim() || speaker;
  return { displayName, avatarUrl: override?.avatarUrl };
}

/**
 * Findet das erste vorkommende avatarUrl eines Speakers im gesamten Doc —
 * nützlich, um eine sinnvolle Vorschau anzubieten, bevor die Nutzerin
 * einen globalen Avatar gesetzt hat.
 */
export function findFirstPerLineAvatar(doc: FunnelDoc, speaker: string): string | undefined {
  let found: string | undefined;
  walkBlocks(doc, (type, props) => {
    if (found || type !== 'quest_dialog') return;
    const lines = (props.lines as DialogLine[] | undefined) ?? [];
    for (const line of lines) {
      if (line.speaker === speaker && line.avatarUrl) {
        found = line.avatarUrl;
        return;
      }
    }
  });
  return found;
}
