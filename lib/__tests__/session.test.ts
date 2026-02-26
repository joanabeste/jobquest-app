import { sign, unsign } from '../session';

describe('sign / unsign', () => {
  test('sign produces value.signature format', () => {
    const signed = sign('member-123');
    expect(signed).toContain('.');
    const parts = signed.split('.');
    expect(parts.length).toBe(2);
    expect(parts[0]).toBe('member-123');
    expect(parts[1].length).toBeGreaterThan(0);
  });

  test('unsign recovers original value', () => {
    const signed = sign('test-id-456');
    expect(unsign(signed)).toBe('test-id-456');
  });

  test('unsign returns null for tampered signature', () => {
    const signed = sign('my-value');
    const tampered = signed.slice(0, -1) + 'X';
    expect(unsign(tampered)).toBeNull();
  });

  test('unsign returns null for tampered value', () => {
    const signed = sign('original');
    const parts = signed.split('.');
    const tampered = 'hacked.' + parts[1];
    expect(unsign(tampered)).toBeNull();
  });

  test('unsign returns null for string without dot', () => {
    expect(unsign('nodothere')).toBeNull();
  });

  test('unsign returns null for empty string with dot', () => {
    expect(unsign('.')).toBeNull();
  });

  test('different values produce different signatures', () => {
    const sig1 = sign('user-1');
    const sig2 = sign('user-2');
    expect(sig1).not.toBe(sig2);
  });

  test('same value produces same signature (deterministic)', () => {
    expect(sign('abc')).toBe(sign('abc'));
  });
});
