/**
 * @jest-environment jsdom
 */

import { htmlToPlainText, setPlainText } from '../rich-text';

describe('htmlToPlainText', () => {
  it('returns empty for empty input', () => {
    expect(htmlToPlainText('')).toBe('');
  });

  it('passes through plain text without tags', () => {
    expect(htmlToPlainText('Hi @firstName')).toBe('Hi @firstName');
  });

  it('strips simple paragraph wrapper', () => {
    expect(htmlToPlainText('<p>Hi</p>')).toBe('Hi');
  });

  it('strips inline span with style', () => {
    expect(htmlToPlainText('<p><span style="color:red">Hi</span></p>')).toBe('Hi');
  });

  it('converts paragraph breaks to newlines', () => {
    expect(htmlToPlainText('<p>A</p><p>B</p>')).toBe('A\nB');
  });

  it('converts <br> to newlines', () => {
    expect(htmlToPlainText('<p>Line1<br>Line2</p>')).toBe('Line1\nLine2');
  });

  it('preserves @ mentions', () => {
    expect(htmlToPlainText('<p><span style="color:red">Hi @firstName</span></p>'))
      .toBe('Hi @firstName');
  });
});

describe('setPlainText', () => {
  it('returns newText when original is empty', () => {
    expect(setPlainText('', 'Hello')).toBe('Hello');
  });

  it('returns newText when original has no tags', () => {
    expect(setPlainText('Hi', 'Hello')).toBe('Hello');
  });

  it('preserves single-span color when replacing whole text', () => {
    const html = '<p><span style="color:red">Hi</span></p>';
    const result = setPlainText(html, 'Hello');
    expect(result).toContain('color:red');
    expect(result).toContain('Hello');
    expect(result).not.toContain('Hi');
  });

  it('preserves first span when only the second changes (diff)', () => {
    const html =
      '<p><span style="color:red">Hi</span> <span style="color:blue">there</span></p>';
    const result = setPlainText(html, 'Hi everyone', 'Hi there');
    expect(result).toContain('color:red">Hi</span>');
    expect(result).toContain('color:blue">everyone</span>');
  });

  it('preserves second span when only the first changes (diff)', () => {
    const html =
      '<p><span style="color:red">Hi</span><span style="color:blue"> there</span></p>';
    const result = setPlainText(html, 'Hello there', 'Hi there');
    expect(result).toContain('color:red">Hello</span>');
    expect(result).toContain('color:blue"> there</span>');
  });

  it('handles single-character insertion', () => {
    const html = '<p><span style="font-weight:600">Hi</span></p>';
    const result = setPlainText(html, 'HiX', 'Hi');
    expect(result).toContain('font-weight:600');
    expect(result).toContain('HiX');
  });

  it('handles deletion in the middle', () => {
    const html = '<p>Hello</p>';
    const result = setPlainText(html, 'Helo', 'Hello');
    expect(result).toBe('<p>Helo</p>');
  });

  it('handles pure insertion at start', () => {
    const html = '<p><span style="color:red">Hi</span></p>';
    const result = setPlainText(html, 'ZHi', 'Hi');
    expect(result).toContain('color:red">ZHi</span>');
  });

  it('handles pure insertion at end', () => {
    const html = '<p><span style="color:red">Hi</span></p>';
    const result = setPlainText(html, 'HiX', 'Hi');
    expect(result).toContain('color:red">HiX</span>');
  });

  it('falls back to plain text when value is multi-paragraph', () => {
    const html = '<p>A</p><p>B</p>';
    const result = setPlainText(html, 'A\nC', 'A\nB');
    expect(htmlToPlainText(result)).toBe('A\nC');
  });

  it('preserves text-align attribute on paragraph wrapper', () => {
    const html = '<p style="text-align:center"><span style="color:red">Hi</span></p>';
    const result = setPlainText(html, 'Hello');
    expect(result).toContain('text-align:center');
    expect(result).toContain('color:red');
    expect(result).toContain('Hello');
  });
});
