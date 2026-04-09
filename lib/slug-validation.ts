import { slugify } from './utils';

// Slug format: lowercase alphanumeric + hyphens, 3-80 chars, no leading/trailing hyphens
const SLUG_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const MIN_LENGTH = 3;
const MAX_LENGTH = 80;

// Reserved words: app route segments and common reserved paths
const RESERVED_SLUGS = new Set([
  'login', 'register', 'signup', 'dashboard', 'api', 'auth', 'admin',
  'settings', 'editor', 'new', 'dev', 'c', 'jobquest', 'berufscheck',
  'formular', 'uebersicht', 'leads', 'team', 'statistiken', 'einstellungen',
  'company-profile', 'forgot-password', 'reset-password', 'accept-invite',
  'berufscheck-leads', 'berufscheck-editor', 'formular-editor',
  'impressum', 'datenschutz', 'agb', 'help', 'support', 'about',
  'public', 'static', 'assets', 'images', 'fonts', 'css', 'js',
]);

export type EntityType = 'job_quest' | 'career_check' | 'form_page' | 'company';

export interface SlugValidationResult {
  valid: boolean;
  reason?: string;
  /** The sanitized slug (after slugify) — may differ from input */
  sanitized: string;
}

/**
 * Validate a slug string. Returns sanitized slug + validity.
 * Does NOT check database uniqueness — that requires a server call.
 */
export function validateSlug(raw: string): SlugValidationResult {
  const sanitized = slugify(raw);

  if (!sanitized) {
    return { valid: false, reason: 'Slug darf nicht leer sein.', sanitized };
  }
  if (sanitized.length < MIN_LENGTH) {
    return { valid: false, reason: `Mindestens ${MIN_LENGTH} Zeichen.`, sanitized };
  }
  if (sanitized.length > MAX_LENGTH) {
    return { valid: false, reason: `Maximal ${MAX_LENGTH} Zeichen.`, sanitized };
  }
  if (!SLUG_REGEX.test(sanitized)) {
    return { valid: false, reason: 'Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt.', sanitized };
  }
  if (RESERVED_SLUGS.has(sanitized)) {
    return { valid: false, reason: 'Dieser Slug ist reserviert.', sanitized };
  }

  return { valid: true, sanitized };
}

/** Map entity type to its DB table name */
export function entityTypeToTable(type: EntityType): string {
  switch (type) {
    case 'job_quest': return 'job_quests';
    case 'career_check': return 'career_checks';
    case 'form_page': return 'form_pages';
    case 'company': return 'companies';
  }
}

/** Map entity type to its public URL prefix */
export function entityTypeToPathPrefix(type: EntityType): string {
  switch (type) {
    case 'job_quest': return '/jobquest';
    case 'career_check': return '/berufscheck';
    case 'form_page': return '/formular';
    case 'company': return '/c';
  }
}
