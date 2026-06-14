'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { readableTextColor, readableAccentColor } from '@/lib/contrast';

const CI_VARS = ['--ci-primary', '--ci-on-primary', '--ci-primary-hover', '--ci-primary-soft', '--ci-ink'] as const;

/**
 * Setzt die CI-CSS-Variablen (--ci-*) auf dem <html>-Element anhand der
 * Hauptfarbe des eingeloggten Unternehmens. Dadurch übernehmen alle geteilten
 * Primitive (.btn-primary, .input-field, bg-ci …) automatisch die Markenfarbe.
 *
 * Solange noch kein Unternehmen geladen ist oder keine Hauptfarbe gesetzt wurde,
 * greifen die Default-Variablen aus globals.css (JobQuest-Violett).
 */
export default function CiThemeProvider({ children }: { children: React.ReactNode }) {
  const { company } = useAuth();
  const primary = company?.corporateDesign?.primaryColor;

  useEffect(() => {
    const root = document.documentElement;
    if (!primary) {
      // Kein CI → auf die globals.css-Defaults zurückräumen.
      CI_VARS.forEach((v) => root.style.removeProperty(v));
      return;
    }
    root.style.setProperty('--ci-primary', primary);
    root.style.setProperty('--ci-on-primary', readableTextColor(primary));
    root.style.setProperty('--ci-primary-hover', `color-mix(in srgb, ${primary} 85%, black)`);
    root.style.setProperty('--ci-primary-soft', `color-mix(in srgb, ${primary} 10%, white)`);
    root.style.setProperty('--ci-ink', readableAccentColor(primary));

    return () => {
      CI_VARS.forEach((v) => root.style.removeProperty(v));
    };
  }, [primary]);

  return <>{children}</>;
}
