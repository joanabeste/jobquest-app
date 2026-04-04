import { slugify, formatDateShort } from '../utils';

describe('slugify', () => {
  test('lowercases text', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  test('replaces German umlauts', () => {
    expect(slugify('Über Öffentliche Ämter')).toBe('ueber-oeffentliche-aemter');
  });

  test('replaces ß with ss', () => {
    expect(slugify('Straße')).toBe('strasse');
  });

  test('removes special characters', () => {
    expect(slugify('Hallo! Wie geht\'s?')).toBe('hallo-wie-gehts');
  });

  test('collapses multiple separators', () => {
    expect(slugify('a   b---c___d')).toBe('a-b-c-d');
  });

  test('trims leading/trailing dashes', () => {
    expect(slugify('--hello--')).toBe('hello');
  });

  test('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  test('combined: umlauts + special chars + spaces', () => {
    expect(slugify('Bürokaufmann/-frau (m/w/d)')).toBe('buerokaufmann-frau-mwd');
  });

  test('handles numeric-only input', () => {
    expect(slugify('123')).toBe('123');
  });

  test('handles string with only special characters', () => {
    expect(slugify('!@#$%')).toBe('');
  });

  test('handles ae/oe/ue umlauts', () => {
    expect(slugify('Ärzte Öl Übung')).toBe('aerzte-oel-uebung');
  });

  test('handles mixed case', () => {
    expect(slugify('FrontEnd Developer')).toBe('frontend-developer');
  });

  test('handles dots and commas', () => {
    expect(slugify('z.B. Verkauf, Service')).toBe('zb-verkauf-service');
  });

  test('very long string stays intact', () => {
    const long = 'wort '.repeat(20).trim();
    expect(slugify(long).split('-')).toHaveLength(20);
  });
});

describe('formatDateShort', () => {
  test('formats ISO date to DD.MM.YYYY', () => {
    const result = formatDateShort('2025-06-15T10:30:00Z');
    expect(result).toMatch(/15\.06\.2025/);
  });

  test('handles date-only string', () => {
    const result = formatDateShort('2024-01-01');
    expect(result).toMatch(/01\.01\.2024/);
  });
});
