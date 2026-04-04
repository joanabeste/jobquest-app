/**
 * @jest-environment jsdom
 */
import { sanitizeHtml } from '../sanitize';

describe('sanitizeHtml', () => {
  describe('passthrough', () => {
    test('returns empty string unchanged', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    test('preserves plain text', () => {
      expect(sanitizeHtml('Hello World')).toBe('Hello World');
    });

    test('preserves formatting tags', () => {
      const html = '<p><strong>bold</strong> and <em>italic</em></p>';
      expect(sanitizeHtml(html)).toBe(html);
    });

    test('preserves safe links', () => {
      const html = '<a href="https://example.com" target="_blank">link</a>';
      expect(sanitizeHtml(html)).toBe(html);
    });

    test('preserves inline styles', () => {
      const html = '<span style="color: red;">text</span>';
      expect(sanitizeHtml(html)).toBe(html);
    });

    test('preserves images with safe src', () => {
      const html = '<img src="https://example.com/img.png" alt="photo">';
      expect(sanitizeHtml(html)).toBe(html);
    });
  });

  describe('XSS removal', () => {
    test('strips onclick handler', () => {
      const input = '<button onclick="alert(1)">click</button>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onclick');
      expect(result).toContain('button');
    });

    test('strips onerror handler on img', () => {
      const input = '<img src="x" onerror="alert(1)">';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onerror');
    });

    test('strips onload handler', () => {
      const input = '<body onload="steal()">text</body>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onload');
    });

    test('strips any on* attribute', () => {
      const input = '<div onmouseover="bad()" onfocus="bad()">hi</div>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onmouseover');
      expect(result).not.toContain('onfocus');
      expect(result).toContain('hi');
    });

    test('strips script elements', () => {
      const input = '<p>text</p><script>alert("xss")</script>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
      expect(result).toContain('text');
    });

    test('strips javascript: href', () => {
      const input = '<a href="javascript:alert(1)">click</a>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('javascript:');
    });

    test('strips javascript: with leading spaces', () => {
      const input = '<a href="  javascript:alert(1)">click</a>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('javascript:');
    });

    test('strips javascript: in uppercase', () => {
      const input = '<a href="JAVASCRIPT:alert(1)">click</a>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('JAVASCRIPT:');
    });

    test('handles combined attack: script + event handler', () => {
      const input = '<div onclick="x()"><script>alert(1)</script>safe</div>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('<script>');
      expect(result).toContain('safe');
    });
  });
});
