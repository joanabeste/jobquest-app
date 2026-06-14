/**
 * Kontrast-Helfer: bestimmt anhand der WCAG-Relativ-Luminanz, ob auf einem
 * gegebenen Hintergrund dunkle oder helle Schrift besser lesbar ist.
 * Dependency-frei — bewusst kein npm-Paket.
 */

const DARK_TEXT = '#0f172a'; // slate-900 — Schrift auf hellem Hintergrund
const LIGHT_TEXT = '#ffffff'; // Schrift auf dunklem Hintergrund

/** Parst #rgb / #rrggbb (mit/ohne #) zu [r,g,b] in 0–255 oder null bei Unfug. */
function parseHex(hex: string): [number, number, number] | null {
  if (typeof hex !== 'string') return null;
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** WCAG relative Luminanz (0 = schwarz, 1 = weiß). */
export function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Liefert die lesbarere Schriftfarbe für den gegebenen Hintergrund:
 * dunkles Slate auf hellem Grund, Weiß auf dunklem Grund.
 * Fallback bei ungültiger Farbe: Weiß (entspricht dem bisherigen Verhalten).
 */
export function readableTextColor(bgHex: string): typeof DARK_TEXT | typeof LIGHT_TEXT {
  if (!parseHex(bgHex)) return LIGHT_TEXT;
  // Schwelle 0.5 trifft die intuitive Hell/Dunkel-Grenze für Markenfarben gut.
  return relativeLuminance(bgHex) > 0.5 ? DARK_TEXT : LIGHT_TEXT;
}

function toHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/**
 * Markenfarbe als lesbare Text-/Icon-Farbe auf HELLEN Flächen (z. B. der
 * 10%-Tint --ci-primary-soft oder weiß).
 *
 * - Dunkle Marken (Indigo, Violett, Blau, Rot …), die als Text auf Weiß noch
 *   AA-lesbar sind, bleiben UNVERÄNDERT kräftig und on-brand.
 * - Helle Marken (Gelb, Lindgrün, Orange …) würden als Schrift nicht ausreichen.
 *   Statt sie zu einem schlammigen Mischton abzudunkeln, fällt die Schriftfarbe
 *   auf sauberes Schwarz (#0f172a, slate-900 — wie die übrige dunkle UI-Schrift).
 * - Es gibt also nur „kräftige Markenfarbe" ODER „sauberes Schwarz", nie ein
 *   abgedunkeltes Marken-Zwischending.
 *
 * Schwelle 0.18 = WCAG-AA-Grenze für Text auf Weiß (1.05/(0.18+0.05) ≈ 4.6:1).
 * Fallback bei ungültiger Farbe: JobQuest-Indigo-deep (#2A14B8).
 */
export function readableAccentColor(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return '#2A14B8';
  // Markenfarbe dunkel genug für lesbare Schrift auf hell → unverändert nutzen.
  if (relativeLuminance(hex) <= 0.18) return toHex(rgb[0], rgb[1], rgb[2]);
  // Zu hell (z. B. Gelb) → neutrales Schwarz statt schlammigem Abdunkeln.
  return DARK_TEXT;
}
