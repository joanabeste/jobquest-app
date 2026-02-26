import { slugify, formatDateShort, getModuleTitle } from '../utils';
import type { QuestModule } from '../types';

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

describe('getModuleTitle', () => {
  test('scene with title', () => {
    expect(getModuleTitle({ id: '1', type: 'scene', title: 'Willkommen', description: '' } as QuestModule)).toBe('Willkommen');
  });

  test('scene without title falls back', () => {
    expect(getModuleTitle({ id: '1', type: 'scene', title: '', description: '' } as QuestModule)).toBe('Szene');
  });

  test('dialog with title', () => {
    expect(getModuleTitle({ id: '1', type: 'dialog', title: 'Gespräch', lines: [] } as QuestModule)).toBe('Gespräch');
  });

  test('dialog without title falls back', () => {
    expect(getModuleTitle({ id: '1', type: 'dialog', lines: [] } as QuestModule)).toBe('Dialog');
  });

  test('decision truncates to 40 chars', () => {
    const long = 'A'.repeat(50);
    expect(getModuleTitle({ id: '1', type: 'decision', question: long, options: [] } as QuestModule)).toBe('A'.repeat(40));
  });

  test('decision without question falls back', () => {
    expect(getModuleTitle({ id: '1', type: 'decision', question: '', options: [] } as QuestModule)).toBe('Entscheidung');
  });

  test('quiz with question', () => {
    expect(getModuleTitle({ id: '1', type: 'quiz', question: 'Was ist 1+1?', options: [] } as QuestModule)).toBe('Was ist 1+1?');
  });

  test('info with title', () => {
    expect(getModuleTitle({ id: '1', type: 'info', title: 'Über uns', text: '' } as QuestModule)).toBe('Über uns');
  });

  test('freetext truncates to 40 chars', () => {
    expect(getModuleTitle({ id: '1', type: 'freetext', text: 'B'.repeat(50) } as QuestModule)).toBe('B'.repeat(40));
  });

  test('image returns fixed label', () => {
    expect(getModuleTitle({ id: '1', type: 'image', imageUrl: '' } as QuestModule)).toBe('Bild-Block');
  });

  test('video returns fixed label', () => {
    expect(getModuleTitle({ id: '1', type: 'video', videoUrl: '' } as QuestModule)).toBe('Video-Block');
  });

  test('audio returns fixed label', () => {
    expect(getModuleTitle({ id: '1', type: 'audio', audioUrl: '' } as QuestModule)).toBe('Audio-Block');
  });

  test('file returns fixed label', () => {
    expect(getModuleTitle({ id: '1', type: 'file', fileUrl: '', filename: '' } as QuestModule)).toBe('Datei-Block');
  });
});
