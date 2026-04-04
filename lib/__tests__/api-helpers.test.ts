import { parseBody } from '../api/helpers';

// Minimal NextRequest mock — only need .json()
function mockRequest(body: string) {
  return {
    json: async () => JSON.parse(body),
  } as unknown as Parameters<typeof parseBody>[0];
}

describe('parseBody', () => {
  test('returns ok:true with parsed data for valid JSON', async () => {
    const req = mockRequest('{"name":"Max","age":30}');
    const result = await parseBody<{ name: string; age: number }>(req);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe('Max');
      expect(result.data.age).toBe(30);
    }
  });

  test('returns ok:false for invalid JSON', async () => {
    const req = { json: async () => { throw new SyntaxError('bad json'); } } as unknown as Parameters<typeof parseBody>[0];
    const result = await parseBody(req);
    expect(result.ok).toBe(false);
  });

  test('handles empty object body', async () => {
    const req = mockRequest('{}');
    const result = await parseBody(req);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({});
  });

  test('handles array body', async () => {
    const req = mockRequest('[1,2,3]');
    const result = await parseBody<number[]>(req);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([1, 2, 3]);
  });
});
