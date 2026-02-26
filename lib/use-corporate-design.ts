import { useEffect } from 'react';
import { Company, DEFAULT_CORPORATE_DESIGN } from '@/lib/types';

/**
 * Derives CSS variables and a <style> string from a company's corporate design.
 * Also injects Google Fonts <link> tags for any non-embedded fonts.
 * Safe to call from any 'use client' component.
 */
export function useCorporateDesign(company: Company) {
  const design = company.corporateDesign ?? DEFAULT_CORPORATE_DESIGN;
  const primary = design.primaryColor;
  const accent  = design.accentColor;
  const br      = `${design.borderRadius ?? 12}px`;

  const hfName = design.headingFontName ?? 'system';
  const bfName = design.bodyFontName   ?? 'system';

  const headingFont = design.headingFontData
    ? `'${hfName}',system-ui,sans-serif`
    : hfName === 'system' ? 'inherit' : `'${hfName}',system-ui,sans-serif`;
  const bodyFont = design.bodyFontData
    ? `'${bfName}',system-ui,sans-serif`
    : bfName === 'system' ? 'inherit' : `'${bfName}',system-ui,sans-serif`;

  const hSize      = design.headingFontSize      ?? 22;
  const hWeight    = design.headingFontWeight    ?? 700;
  const hTransform = design.headingTextTransform ?? 'none';
  const bSize      = design.bodyFontSize         ?? 14;
  const bWeight    = design.bodyFontWeight       ?? 400;
  const bTransform = design.bodyTextTransform    ?? 'none';

  const css = [
    design.headingFontData ? `@font-face{font-family:'${hfName}';src:url('${design.headingFontData}')}` : '',
    design.bodyFontData && bfName !== hfName ? `@font-face{font-family:'${bfName}';src:url('${design.bodyFontData}')}` : '',
    `.fp-root{font-family:${bodyFont};color:${design.textColor ?? '#1e293b'};font-size:${bSize}px;font-weight:${bWeight};text-transform:${bTransform}}`,
    `.fp-btn{background:${primary};color:#fff;border-radius:${br}}`,
    `.fp-btn:hover{filter:brightness(0.88)}`,
    `.fp-btn-sec{background:transparent;color:${primary};border:2px solid ${primary};border-radius:${br}}`,
    `.fp-btn-sec:hover{background:${primary}18}`,
    `.fp-card{border-radius:${br}}`,
    `.fp-opt{border-radius:${br};border:2px solid #e2e8f0;transition:border-color 0.15s,background 0.15s}`,
    `.fp-opt:hover:not(:disabled){border-color:${primary};background:${primary}0d;cursor:pointer}`,
    `.fp-heading{color:${design.headingColor ?? '#0f172a'};font-family:${headingFont};font-size:${hSize}px;font-weight:${hWeight};text-transform:${hTransform}}`,
    `.fp-accent{color:${accent}}`,
    `.fp-check{accent-color:${primary}}`,
    `input:focus,textarea:focus,select:focus{border-color:${primary}!important;outline:none}`,
  ].filter(Boolean).join('\n');

  useEffect(() => {
    const toLoad = [
      !design.headingFontData && hfName !== 'system' ? hfName : null,
      !design.bodyFontData && bfName !== 'system' && bfName !== hfName ? bfName : null,
    ].filter(Boolean) as string[];

    const links = toLoad.map((name) => {
      const link = document.createElement('link');
      link.rel  = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;600;700&display=swap`;
      document.head.appendChild(link);
      return link;
    });
    return () => links.forEach((l) => document.head.removeChild(l));
  }, [hfName, bfName, design.headingFontData, design.bodyFontData]);

  return { primary, accent, br, css };
}
