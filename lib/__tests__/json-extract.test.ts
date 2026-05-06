import { extractJsonObject } from '../json-extract';

describe('extractJsonObject', () => {
  describe('clean inputs', () => {
    it('returns a plain JSON object unchanged', () => {
      const raw = '{"a":1,"b":2}';
      expect(extractJsonObject(raw)).toBe(raw);
    });

    it('handles whitespace around the payload', () => {
      const raw = '  \n  {"a":1}  \n  ';
      expect(extractJsonObject(raw)).toBe('{"a":1}');
    });

    it('returns a JSON array unchanged', () => {
      expect(extractJsonObject('[1,2,3]')).toBe('[1,2,3]');
    });
  });

  describe('markdown code fences', () => {
    it('strips a ```json fenced block', () => {
      expect(extractJsonObject('```json\n{"a":1}\n```')).toBe('{"a":1}');
    });

    it('strips a plain ``` fenced block', () => {
      expect(extractJsonObject('```\n{"a":1}\n```')).toBe('{"a":1}');
    });
  });

  describe('prose around the JSON', () => {
    it('strips leading prose', () => {
      const raw = 'Hier ist das Ergebnis:\n{"pages":[]}';
      expect(extractJsonObject(raw)).toBe('{"pages":[]}');
    });

    it('strips trailing prose — the bracket-counting fix', () => {
      // The OLD lastIndexOf('}') heuristic would include the trailing prose
      // because it would slice up to the very last '}' in the string. With
      // bracket counting, the slice ends at the matching close bracket of the
      // first opening bracket, so trailing text is dropped.
      const raw = '{"pages":[]} Damit habe ich die gewünschten Änderungen vorgenommen.';
      expect(extractJsonObject(raw)).toBe('{"pages":[]}');
    });

    it('strips both leading and trailing prose', () => {
      const raw = 'Hier: {"a":1} — fertig!';
      expect(extractJsonObject(raw)).toBe('{"a":1}');
    });
  });

  describe('strings containing brackets', () => {
    it('does not get confused by `{` inside string values', () => {
      const raw = '{"text":"hat {Klammern} im String","b":2}';
      expect(extractJsonObject(raw)).toBe(raw);
    });

    it('respects escaped quotes inside strings', () => {
      const raw = '{"text":"sagt \\"hallo\\" und winkt","ok":true}';
      expect(extractJsonObject(raw)).toBe(raw);
    });

    it('handles a string ending right before the closing brace', () => {
      const raw = '{"a":"x"}';
      expect(extractJsonObject(raw)).toBe('{"a":"x"}');
    });
  });

  describe('truncated input', () => {
    it('returns slice from first { to end when brackets never balance', () => {
      // Caller is expected to fail on JSON.parse — but at least the slice is
      // useful for logging and shows what the model produced.
      const raw = 'Hier: {"pages":[{"name":"Seite 1"';
      expect(extractJsonObject(raw)).toBe('{"pages":[{"name":"Seite 1"');
    });
  });

  describe('empty / no JSON', () => {
    it('returns empty string for empty input', () => {
      expect(extractJsonObject('')).toBe('');
    });

    it('returns the raw string when no opening bracket exists', () => {
      expect(extractJsonObject('nur Text ohne JSON')).toBe('nur Text ohne JSON');
    });
  });

  describe('nested objects and arrays', () => {
    it('finds the matching close at the right depth', () => {
      const raw = '{"a":{"b":{"c":1}},"d":[1,[2,3]]}';
      expect(extractJsonObject(raw)).toBe(raw);
    });

    it('returns the first balanced JSON when followed by another JSON', () => {
      // Some models (rarely) emit two JSON objects in a row. The parser
      // should slice the first complete one — JSON.parse would fail on both
      // concatenated, the bracket-counting cleanly stops at the first balance.
      const raw = '{"a":1}{"b":2}';
      expect(extractJsonObject(raw)).toBe('{"a":1}');
    });
  });
});
