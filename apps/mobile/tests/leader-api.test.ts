import { afterEach, describe, expect, test } from 'bun:test';
import { SessionExpiredError } from '../src/access/session';
import { getLeaderCv, getLeaderFacets, listLeaders, listResponsibleCvs } from '../src/main/leader-api';

const originalFetch = globalThis.fetch;
const baseUrl = 'https://api.example.org/api';

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('leader API client', () => {
  test('requests a filtered, paginated directory and validates the response', async () => {
    let requested = '';
    globalThis.fetch = (async (input: string | URL | Request) => {
      requested = String(input);
      return Response.json({
        data: [
          {
            id: 'leader-1',
            accountName: 'Tiana',
            entity: { id: 'e1', name: 'Mavo' },
            group: { id: 'g1', name: 'Tily' },
            responsibilities: ['Haim-panahy'],
            hasAvatar: false,
            hasCv: true,
          },
        ],
        pagination: { page: 2, pageSize: 10, total: 11, totalPages: 2 },
      });
    }) as typeof fetch;
    const result = await listLeaders(
      'token',
      { page: 2, pageSize: 10, q: ' Tiana ', entityId: 'e1', groupId: 'g1' },
      baseUrl,
    );
    expect(new URL(requested).searchParams.get('q')).toBe('Tiana');
    expect(new URL(requested).searchParams.get('page')).toBe('2');
    expect(result.data[0]?.accountName).toBe('Tiana');
    expect(result.pagination.total).toBe(11);
  });

  test('validates directory filter facets', async () => {
    globalThis.fetch = (async () =>
      Response.json({
        entities: [{ id: 'e1', name: 'Mavo' }],
        groups: [{ id: 'g1', name: 'Tily', entityId: 'e1' }],
        responsibilities: [{ id: 'r1', name: 'Haim-panahy' }],
      })) as typeof fetch;
    expect(await getLeaderFacets('token', baseUrl)).toMatchObject({
      entities: [{ name: 'Mavo' }],
      groups: [{ name: 'Tily' }],
    });
  });

  test('rejects malformed directory responses instead of trusting API payloads', async () => {
    globalThis.fetch = (async () => Response.json({ data: [{ id: 7 }], pagination: {} })) as typeof fetch;
    await expect(listLeaders('token', {}, baseUrl)).rejects.toThrow('Valin-teny tsy araka ny tokony ho izy.');
  });

  test('clears session authorization on 401 and reports offline failures', async () => {
    globalThis.fetch = (async () => new Response(null, { status: 401 })) as typeof fetch;
    await expect(listLeaders('token', {}, baseUrl)).rejects.toBeInstanceOf(SessionExpiredError);
    globalThis.fetch = (async () => {
      throw new Error('offline');
    }) as typeof fetch;
    await expect(listLeaders('token', {}, baseUrl)).rejects.toThrow('Tsy tratra ny mpizara. Hamarino ny tambajotra.');
  });

  test('loads one and paginated all-CV responses with strict projection checks', async () => {
    const cv = {
      firstName: 'Tiana',
      lastName: 'Rabe',
      address: 'Antananarivo',
      birthDate: '1990-01-01T00:00:00.000Z',
      birthPlace: null,
      phone: '0341234567',
      email: 'tiana@example.org',
      facebook: null,
      province: 'Analamanga',
      area: 'Avaradrano',
      fivondronana: 'Antananarivo',
      extraPersonal: [],
      extraContact: [],
      branches: [],
      activities: [],
    };
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return Response.json(
        calls === 1 ? cv : { data: [cv], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } },
      );
    }) as typeof fetch;
    expect((await getLeaderCv('token', 'leader-1', baseUrl)).firstName).toBe('Tiana');
    expect((await listResponsibleCvs('token', { page: 1, pageSize: 20 }, baseUrl)).data).toHaveLength(1);
  });
});
