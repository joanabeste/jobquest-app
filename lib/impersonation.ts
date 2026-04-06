import { cookies } from 'next/headers';

const COOKIE_NAME = 'jq_impersonate';

export interface ImpersonationData {
  companyId: string;
  companyName: string;
}

/** Read impersonation cookie (server-side only). Returns null if not impersonating. */
export async function getImpersonation(): Promise<ImpersonationData | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ImpersonationData;
  } catch {
    return null;
  }
}

/** Set impersonation cookie (server-side only). */
export async function setImpersonation(data: ImpersonationData) {
  const store = await cookies();
  store.set(COOKIE_NAME, JSON.stringify(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 4, // 4 hours
  });
}

/** Clear impersonation cookie (server-side only). */
export async function clearImpersonation() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
