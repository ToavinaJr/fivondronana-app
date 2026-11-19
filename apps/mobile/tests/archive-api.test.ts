import { afterEach, describe, expect, test } from 'bun:test';
import { SessionExpiredError } from '../src/access/session';
import { downloadArchive, listArchives } from '../src/main/archive-api';
import { formatArchiveSize } from '../src/main/archive-format';
import * as archiveApi from '../src/main/archive-api';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('archive API client', () => {
  test('formats archive sizes for the Malagasy interface', () => {
    expect(formatArchiveSize(820)).toBe('820 octets');
    expect(formatArchiveSize(12 * 1024)).toBe('12 Ko');
    expect(formatArchiveSize(5 * 1024 * 1024)).toBe('5.0 Mo');
  });

  test('lists and validates published archives', async () => {
    let requestedUrl = '';
    let authorization = '';
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      requestedUrl = String(input);
      authorization = new Headers(init?.headers).get('Authorization') ?? '';
      return Response.json([
        {
          id: 'archive-1',
          title: 'Tantaran’ny fikambanana',
          description: 'Tantara',
          category: 'Tantara',
          year: 2025,
          fileName: 'tantara.pdf',
          contentType: 'application/pdf',
          size: 123,
          createdAt: '2026-11-19T08:00:00.000Z',
        },
      ]);
    }) as typeof fetch;

    const archives = await listArchives('access-token', 'https://api.example.org/api/');

    expect(requestedUrl).toBe('https://api.example.org/api/archives');
    expect(authorization).toBe('Bearer access-token');
    expect(archives[0]).toMatchObject({ id: 'archive-1', title: 'Tantaran’ny fikambanana', year: 2025, size: 123 });
  });

  test('downloads original bytes with the current access token', async () => {
    let requestedUrl = '';
    let authorization = '';
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      requestedUrl = String(input);
      authorization = new Headers(init?.headers).get('Authorization') ?? '';
      return new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), { status: 200 });
    }) as typeof fetch;

    const bytes = await downloadArchive('archive-1', 'token', 'https://api.example.org/api', 4);

    expect(requestedUrl).toBe('https://api.example.org/api/archives/archive-1/download');
    expect(authorization).toBe('Bearer token');
    expect(Array.from(bytes)).toEqual([0x25, 0x50, 0x44, 0x46]);
  });

  test('rejects a successful download whose byte length differs from archive metadata', async () => {
    globalThis.fetch = (async () => new Response(new Uint8Array([0x25, 0x50, 0x44]), { status: 200 })) as typeof fetch;

    await expect(downloadArchive('archive-1', 'token', 'https://api.example.org/api', 4)).rejects.toThrow(
      'Tsy mifanaraka amin’ny haben’ny rakitra voatahiry ny rakitra azo.',
    );
  });

  test('distinguishes expired-session failures from retryable archive errors', () => {
    expect(archiveApi.archiveErrorKind?.(new SessionExpiredError())).toBe('session-expired');
    expect(archiveApi.archiveErrorKind?.(new Error('offline'))).toBe('retryable');
  });

  test('treats unauthorized and malformed responses as errors', async () => {
    globalThis.fetch = (async () => new Response(null, { status: 401 })) as typeof fetch;
    await expect(listArchives('token', 'https://api.example.org/api')).rejects.toBeInstanceOf(SessionExpiredError);

    globalThis.fetch = (async () => Response.json([{ id: 'archive-1' }])) as typeof fetch;
    await expect(listArchives('token', 'https://api.example.org/api')).rejects.toThrow(
      'Valin-teny tsy araka ny tokony ho izy.',
    );
  });

  test('maps network and permission errors without attempting JSON parsing', async () => {
    globalThis.fetch = (async () => {
      throw new Error('offline');
    }) as typeof fetch;
    await expect(listArchives('token', 'https://api.example.org/api')).rejects.toThrow(
      'Tsy tratra ny mpizara. Hamarino ny tambajotra.',
    );

    globalThis.fetch = (async () => new Response(null, { status: 403 })) as typeof fetch;
    await expect(downloadArchive('archive-1', 'token', 'https://api.example.org/api', 4)).rejects.toThrow(
      'Tsy manana alalana',
    );
  });
});
