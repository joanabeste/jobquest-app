import { DEFAULT_CORPORATE_DESIGN } from '@/lib/types';

/**
 * Markenkonformer Ladescreen für die öffentlichen Live-Ansichten: Firmenlogo
 * zentriert, darunter ein dezenter Spinner in der CI-Primärfarbe. Logo + Farbe
 * werden bereits serverseitig (page.tsx → brand-Prop) übergeben, sodass der
 * Kandidat während des Client-Fetchs sofort die Marke sieht statt eines
 * generischen Spinners. Ohne Logo greift das JobQuest-Mark als Fallback.
 *
 * Reine Präsentation, keine Hooks → kein 'use client' nötig.
 */
export function BrandedLoadingScreen({ logoUrl, accentColor }: { logoUrl?: string; accentColor?: string }) {
  const color = accentColor || DEFAULT_CORPORATE_DESIGN.primaryColor;
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-5 animate-[fadeIn_.3s_ease-out]">
        {logoUrl
          ? <img src={logoUrl} alt="" className="max-h-16 max-w-[220px] object-contain" />
          : <img src="/brand/jq-mark-indigo.png" alt="" className="h-12 w-12 object-contain" />}
        <div
          className="w-7 h-7 rounded-full border-2 animate-spin"
          style={{ borderColor: `${color}33`, borderTopColor: color }}
        />
      </div>
    </div>
  );
}
