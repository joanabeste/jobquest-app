/**
 * Row-access helpers for `*FromDb` mappers.
 *
 * Background: the Supabase clients in this project are intentionally untyped
 * (the service-role client returns `never` row types under the generated
 * `Database` types), so mapper inputs cannot be statically narrowed. Before
 * this module, every mapper accepted `row: any`, which silently swallowed
 * schema drift — a renamed column would just become `undefined` at runtime.
 *
 * These helpers force every read to go through a typed accessor. If the column
 * is missing or the wrong shape, the caller decides whether to throw or fall
 * back. The mapper code stays compact, but `any` is gone.
 */

export type DbRow = Record<string, unknown>;

export function str(row: DbRow, key: string): string {
  const v = row[key];
  if (typeof v !== 'string') {
    throw new Error(`row.${key} expected string, got ${typeof v}`);
  }
  return v;
}

export function optStr(row: DbRow, key: string): string | undefined {
  const v = row[key];
  if (v === null || v === undefined) return undefined;
  if (typeof v !== 'string') {
    throw new Error(`row.${key} expected string|null, got ${typeof v}`);
  }
  return v;
}

export function bool(row: DbRow, key: string): boolean {
  const v = row[key];
  if (typeof v !== 'boolean') {
    throw new Error(`row.${key} expected boolean, got ${typeof v}`);
  }
  return v;
}

export function optBool(row: DbRow, key: string): boolean | undefined {
  const v = row[key];
  if (v === null || v === undefined) return undefined;
  if (typeof v !== 'boolean') {
    throw new Error(`row.${key} expected boolean|null, got ${typeof v}`);
  }
  return v;
}

export function num(row: DbRow, key: string, fallback?: number): number {
  const v = row[key];
  if (v === null || v === undefined) {
    if (fallback !== undefined) return fallback;
    throw new Error(`row.${key} expected number, got null`);
  }
  if (typeof v !== 'number') {
    throw new Error(`row.${key} expected number, got ${typeof v}`);
  }
  return v;
}

/**
 * Pass-through for JSON columns (jsonb / json). Returns the raw value as
 * `unknown` so the caller must cast or validate before use. Cheaper than
 * full validation; the alternative would be a Zod schema per JSON column.
 */
export function json<T = unknown>(row: DbRow, key: string, fallback?: T): T {
  const v = row[key];
  if (v === null || v === undefined) {
    if (fallback !== undefined) return fallback;
    return undefined as unknown as T;
  }
  return v as T;
}
