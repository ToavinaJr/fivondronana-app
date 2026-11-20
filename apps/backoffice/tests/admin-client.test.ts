import { describe, expect, it } from 'bun:test';
import { type AdminRequestOptions, adminRequest } from '../src/admin-client';

describe('backoffice administration API client', () => {
  it('sends same-origin cookie requests with CSRF proof and preserves query strings', async () => {
    let request: Request | undefined;
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      request = new Request(new URL(input.toString(), 'http://localhost'), init);
      return Response.json({ data: [], pagination: { page: 2, pageSize: 20, total: 21, totalPages: 2 } });
    }) as typeof fetch;

    const result = await adminRequest<{ data: unknown[] }>('users?page=2&pageSize=20&q=Rabe', {
      csrfToken: 'csrf-value',
      fetcher,
    });

    expect(request?.url).toBe('http://localhost/api/admin/users?page=2&pageSize=20&q=Rabe');
    expect(request?.credentials).toBe('include');
    expect(request?.headers.get('X-CSRF-Token')).toBe('csrf-value');
    expect(request?.headers.get('Authorization')).toBeNull();
    expect(result.data).toEqual([]);
  });

  it('serializes mutation bodies and treats no-content responses as success', async () => {
    let request: Request | undefined;
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      request = new Request(new URL(input.toString(), 'http://localhost'), init);
      return new Response(null, { status: 204 });
    }) as typeof fetch;

    await adminRequest<void>('users/user-1/active', {
      method: 'PATCH',
      body: { isActive: false },
      csrfToken: 'csrf-value',
      fetcher,
    });

    expect(request?.headers.get('Content-Type')).toBe('application/json');
    expect(await request?.text()).toBe('{"isActive":false}');
  });

  it('rejects paths outside the administration API before making a request', async () => {
    let called = false;
    const fetcher = (async () => {
      called = true;
      return Response.json({});
    }) as typeof fetch;
    const options: AdminRequestOptions = { fetcher };

    await expect(adminRequest('../auth/browser/me', options)).rejects.toThrow('Chemin API invalide.');
    expect(called).toBe(false);
  });

  it('surfaces API error messages even when the response body is empty or invalid', async () => {
    await expect(
      adminRequest('users', {
        fetcher: (async () => Response.json({ message: 'Accès refusé.' }, { status: 403 })) as typeof fetch,
      }),
    ).rejects.toThrow('Accès refusé.');
  });

  it('sends FormData bodies as multipart without a JSON Content-Type header', async () => {
    let request: Request | undefined;
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      request = new Request(new URL(input.toString(), 'http://localhost'), init);
      return Response.json({ id: 'archive-1' });
    }) as typeof fetch;
    const body = new FormData();
    body.append('title', 'Tantara');
    body.append('file', new Blob(['%PDF-1.7'], { type: 'application/pdf' }), 'fixture.pdf');

    await adminRequest('archives', { method: 'POST', body, csrfToken: 'csrf-value', fetcher });

    expect(request?.headers.get('Content-Type')).toContain('multipart/form-data');
    expect(request?.headers.get('X-CSRF-Token')).toBe('csrf-value');
    const sent = await request?.formData();
    expect(sent?.get('title')).toBe('Tantara');
    expect((sent?.get('file') as File)?.name).toBe('fixture.pdf');
  });
});
