/**
 * Extracts a single top-level JSON object/array from a raw model response.
 *
 * Robust against three common LLM output quirks:
 *  1. Markdown code-fences around the JSON (```json … ```).
 *  2. Free-form prose before or after the JSON ("Hier ist das Ergebnis: { … } Damit habe ich …").
 *  3. JSON-string contents that contain `{` `}` `[` `]` characters and escaped quotes.
 *
 * Strategy: walk the string from the first `{` (or `[`), count opening/closing
 * brackets while respecting string literals and their escapes, and slice at
 * the index where the bracket count returns to zero. If the brackets never
 * balance — typically because the model output was truncated — return the
 * slice from the first opening bracket to end-of-string, so the caller's
 * `JSON.parse` still fails (correctly), but with the largest possible candidate.
 *
 * No exceptions thrown — always returns a string. Intentionally permissive,
 * because the caller does the actual parsing and validation downstream.
 */
export function extractJsonObject(raw: string): string {
  if (!raw) return '';
  let s = raw.trim();

  // 1) Strip a single fenced code block, if the entire payload is wrapped.
  const fenced = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) s = fenced[1].trim();

  // 2) Find the first opening bracket.
  let start = -1;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '{' || c === '[') {
      start = i;
      break;
    }
  }
  if (start === -1) return s; // no JSON-like content found, hand back as-is

  // 3) Walk from `start`, tracking bracket depth and string state.
  const open = s[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === '\\') {
        escape = true;
        continue;
      }
      if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) {
        return s.slice(start, i + 1);
      }
    }
  }

  // Brackets never balanced — likely truncated. Return everything from start;
  // JSON.parse will fail, but the caller has the longest possible candidate
  // and can log it for debugging.
  return s.slice(start);
}
