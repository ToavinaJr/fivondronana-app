import { describe, expect, it } from 'bun:test';
import { authRequest, csrfTokenFromCookie, isAdministrator, tokenFromLocationHash } from '../src/auth-client';

describe('backoffice browser authentication helpers', () => {
  it('reads the readable CSRF cookie without exposing session cookies', () => {
    expect(csrfTokenFromCookie('__Host-fivondronana-csrf=csrf-value; theme=light')).toBe('csrf-value');
    expect(csrfTokenFromCookie('__Host-fivondronana-access=secret')).toBeUndefined();
  });

  it('extracts a one-time token from an invitation or recovery fragment', () => {
    expect(tokenFromLocationHash('#token=abc123')).toBe('abc123');
    expect(tokenFromLocationHash('#/reset-password?token=abc%20123')).toBe('abc 123');
    expect(tokenFromLocationHash('#token=')).toBeUndefined();
  });

  it('gates the protected shell on the administrator role', () => {
    expect(
      isAdministrator({ id: 'admin', accountName: 'Admin', email: null, phone: null, roles: ['ADMINISTRATOR'] }),
    ).toBe(true);
    expect(
      isAdministrator({ id: 'leader', accountName: 'Leader', email: null, phone: null, roles: ['RESPONSIBLE'] }),
    ).toBe(false);
  });

  it('uses credentialed cookie requests and sends CSRF proof without storing bearer tokens', async () => {
    let request: Request | undefined;
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      request = new Request(new URL(input.toString(), 'http://localhost'), init);
      return Response.json({ user: { id: 'admin-1' }, csrfToken: 'csrf-value' });
    }) as typeof fetch;

    await authRequest('browser/login', {
      method: 'POST',
      csrfToken: 'csrf-value',
      body: { identifier: 'admin@example.test', password: 'secret', rememberMe: true },
      fetcher,
    });

    expect(request?.credentials).toBe('include');
    expect(request?.headers.get('X-CSRF-Token')).toBe('csrf-value');
    expect(request?.headers.get('Authorization')).toBeNull();
    expect(await request?.text()).toContain('rememberMe');
  });
});
