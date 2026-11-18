import { afterEach, describe, expect, test } from 'bun:test';
import { listContacts } from '../src/main/contact-api';
import { SessionExpiredError } from '../src/access/session';

const originalFetch = globalThis.fetch;
const baseUrl = 'https://api.example.org/api';

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('contact API client', () => {
  test('requests a filtered, paginated contact list and validates the response', async () => {
    let requested = '';
    globalThis.fetch = (async (input: string | URL | Request) => {
      requested = String(input);
      return Response.json({
        data: [
          {
            id: 'contact-1',
            name: 'Filoha koto',
            responsibility: 'Mpitantam-bola foibe',
            groupLabel: 'Tily foibe',
            address: 'Antananarivo',
            phone: '+261 34 20 344 96',
            email: 'filoha.koto@example.org',
            description: 'Mifandraisa amin’ireo.',
            kind: 'INTERNAL',
          },
        ],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      });
    }) as typeof fetch;
    const result = await listContacts('token', { page: 1, pageSize: 20, q: '  koto ' }, baseUrl);
    expect(new URL(requested).searchParams.get('q')).toBe('koto');
    expect(result.data[0]?.name).toBe('Filoha koto');
    expect(result.pagination.total).toBe(1);
  });

  test('rejects malformed contact responses instead of trusting API payloads', async () => {
    globalThis.fetch = (async () => Response.json({ data: [{ id: 7 }], pagination: {} })) as typeof fetch;
    await expect(listContacts('token', {}, baseUrl)).rejects.toThrow('Valin-teny tsy araka ny tokony ho izy.');
  });

  test('clears session authorization on 401 and reports offline failures', async () => {
    globalThis.fetch = (async () => new Response(null, { status: 401 })) as typeof fetch;
    await expect(listContacts('token', {}, baseUrl)).rejects.toBeInstanceOf(SessionExpiredError);
    globalThis.fetch = (async () => {
      throw new Error('offline');
    }) as typeof fetch;
    await expect(listContacts('token', {}, baseUrl)).rejects.toThrow('Tsy tratra ny mpizara. Hamarino ny tambajotra.');
  });

  test('surfaces a retryable error when the server rejects the request', async () => {
    globalThis.fetch = (async () => new Response(null, { status: 403 })) as typeof fetch;
    await expect(listContacts('token', {}, baseUrl)).rejects.toThrow('Tsy azo vakina ny angona. Andramo indray.');
  });
});
