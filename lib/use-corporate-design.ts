import { Company, DEFAULT_CORPORATE_DESIGN } from '@/lib/types';
import { fontFamilyFor } from '@/lib/fonts';

/**
 * Derives CSS variables and a <style> string from a company's corporate design.
 * Self-hosted Google Fonts are loaded via next/font in the root layout — no
 * runtime CDN requests needed.
 * Safe to call from any 'use client' component.
 */
export function useCorporateDesign(company: Company) {
  const design = company.corporateDesign ?? DEFAULT_CORPORATE_DESIGN;
  const primary = design.primaryColor || DEFAULT_CORPORATE_DESIGN.primaryColor;
  const accent  = design.accentColor || DEFAULT_CORPORATE_DESIGN.accentColor;
  const br      = `${design.borderRadius ?? 12}px`;

  const hfName = design.headingFontName ?? 'system';
  const bfName = design.bodyFontName   ?? 'system';
  const btnFontName = design.buttonFontName ?? bfName;

  const headingFont = design.headingFontData
    ? `'${hfName}',system-ui,sans-serif`
    : hfName === 'system' ? 'inherit' : fontFamilyFor(hfName);
  const bodyFont = design.bodyFontData
    ? `'${bfName}',system-ui,sans-serif`
    : bfName === 'system' ? 'inherit' : fontFamilyFor(bfName);
  const buttonFont = design.buttonFontData
    ? `'${btnFontName}',system-ui,sans-serif`
    : btnFontName === 'system' ? 'inherit' : fontFamilyFor(btnFontName);

  const hSize      = design.headingFontSize      ?? 22;
  const hWeight    = design.headingFontWeight    ?? 700;
  const hTransform = design.headingTextTransform ?? 'none';
  const hLetter    = (design.headingLetterSpacing ?? 0) / 1000;
  const bSize      = design.bodyFontSize         ?? 14;
  const bWeight    = design.bodyFontWeight       ?? 400;
  const bTransform = design.bodyTextTransform    ?? 'none';
  const bLetter    = (design.bodyLetterSpacing   ?? 0) / 1000;

  // Button-specific overrides. If a field is unset, fall back to primary/body.
  const btnBg     = design.buttonColor      || primary;
  const btnText   = design.buttonTextColor  || '#ffffff';
  const btnSize   = design.buttonFontSize   ?? bSize;
  const btnWeight = design.buttonFontWeight ?? 600;

  // Only emit a custom @font-face for the button if a different font was uploaded
  // (avoid re-declaring the same family under another name).
  const buttonFontFaceNeeded = design.buttonFontData && btnFontName !== hfName && btnFontName !== bfName;

  const css = [
    design.headingFontData ? `@font-face{font-family:'${hfName}';src:url('${design.headingFontData}')}` : '',
    design.bodyFontData && bfName !== hfName ? `@font-face{font-family:'${bfName}';src:url('${design.bodyFontData}')}` : '',
    buttonFontFaceNeeded ? `@font-face{font-family:'${btnFontName}';src:url('${design.buttonFontData}')}` : '',
    `.fp-root{font-family:${bodyFont};color:${design.textColor ?? '#1e293b'};font-size:${bSize}px;font-weight:${bWeight};text-transform:${bTransform};letter-spacing:${bLetter}em}`,
    `.fp-btn{background:${btnBg};color:${btnText};border-radius:${br};font-family:${buttonFont};font-size:${btnSize}px;font-weight:${btnWeight}}`,
    `.fp-btn:hover{filter:brightness(0.88)}`,
    `.fp-btn-sec{background:transparent;color:${btnBg};border:2px solid ${btnBg};border-radius:${br};font-family:${buttonFont};font-size:${btnSize}px;font-weight:${btnWeight}}`,
    `.fp-btn-sec:hover{background:${btnBg}18}`,
    `.fp-card{border-radius:${br}}`,
    `.fp-opt{border-radius:${br};border:2px solid #e2e8f0;transition:border-color 0.15s,background 0.15s}`,
    `.fp-opt:hover:not(:disabled){border-color:${primary};background:${primary}0d;cursor:pointer}`,
    `.fp-heading{color:${design.headingColor ?? '#0f172a'};font-family:${headingFont};font-size:${hSize}px;font-weight:${hWeight};text-transform:${hTransform};letter-spacing:${hLetter}em;hyphens:auto;-webkit-hyphens:auto;overflow-wrap:break-word;hyphenate-limit-chars:16 7 5;-webkit-hyphenate-limit-chars:16 7 5;-webkit-hyphenate-limit-before:7;-webkit-hyphenate-limit-after:5}`,
    `.fp-accent{color:${accent}}`,
    `.fp-check{accent-color:${primary}}`,
    `input:focus,textarea:focus,select:focus{border-color:${primary}!important;outline:none}`,
  ].filter(Boolean).join('\n');

  const headingColor = design.headingColor ?? DEFAULT_CORPORATE_DESIGN.headingColor;
  const textColor    = design.textColor    ?? DEFAULT_CORPORATE_DESIGN.textColor;

  return { primary, accent, headingColor, textColor, br, css, buttonBg: btnBg, buttonText: btnText };
}
