export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const contentType = res.headers.get('content-type') ?? '';
    const err = contentType.includes('application/json')
      ? await res.json().catch(() => ({ error: res.statusText }))
      : { error: `${res.status} ${res.statusText}` };
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}
