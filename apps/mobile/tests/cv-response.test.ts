import { describe, expect, test } from 'bun:test';
import { readCvResponse } from '../src/access/cv-response';

describe('personal CV response', () => {
  test('opens a blank form for an empty successful GET response', async () => {
    expect(await readCvResponse(new Response(''), true)).toBeNull();
    expect(await readCvResponse(new Response(null, { status: 204 }), true)).toBeNull();
    expect(await readCvResponse(Response.json(null), true)).toBeNull();
  });

  test('does not treat an empty save response as a saved CV', async () => {
    await expect(readCvResponse(new Response(''), false)).rejects.toThrow('Valin-teny');
    await expect(readCvResponse(Response.json(null), false)).rejects.toThrow('Valin-teny');
  });

  test('reports malformed JSON instead of leaking a parser error', async () => {
    await expect(readCvResponse(new Response('{'), true)).rejects.toThrow('Valin-teny');
    await expect(readCvResponse(new Response('<html>error</html>'), false)).rejects.toThrow('Valin-teny');
  });

  test('preserves a returned CV', async () => {
    const cv = { firstName: 'Tiana', lastName: 'Test', branches: [], activities: [] };
    expect(await readCvResponse(Response.json(cv), true)).toEqual(cv);
    expect(await readCvResponse(Response.json(cv), false)).toEqual(cv);
  });
});
