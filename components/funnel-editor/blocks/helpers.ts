import { sanitizeHtml } from '@/lib/sanitize';

export const s = (v: unknown, fallback = ''): string => (v != null ? String(v) : fallback);
export const n = (v: unknown, fallback = 0): number => (typeof v === 'number' ? v : fallback);
export const b = (v: unknown): boolean => Boolean(v);
export const inlineHtml = (v: string): string => v.replace(/^<p>([\s\S]*?)<\/p>$/, '$1');
export const sh = (v: string): string => sanitizeHtml(v);
