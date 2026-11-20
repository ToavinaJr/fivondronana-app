import { describe, expect, it } from 'bun:test';
import { resolveApiProxyTarget, resolveBackofficePort } from '../src/server-port';

describe('backoffice dev server port', () => {
  it('uses the explicit port from BACKOFFICE_URL', () => {
    expect(resolveBackofficePort('http://localhost:9631')).toBe(9631);
  });

  it('keeps Vite’s default port when BACKOFFICE_URL is not configured', () => {
    expect(resolveBackofficePort(undefined)).toBe(5173);
  });

  it('rejects invalid URLs and ports instead of starting on a mismatched address', () => {
    expect(() => resolveBackofficePort('not-a-url')).toThrow('BACKOFFICE_URL doit être une URL HTTP(S) valide.');
    expect(() => resolveBackofficePort('http://localhost:70000')).toThrow(
      'Le port de BACKOFFICE_URL doit être compris entre 1 et 65535.',
    );
    expect(() => resolveBackofficePort('ftp://localhost:9631')).toThrow(
      'BACKOFFICE_URL doit être une URL HTTP(S) valide.',
    );
  });
});

describe('backoffice API proxy target', () => {
  it('routes browser API requests to the API_PORT configured for the local API', () => {
    expect(resolveApiProxyTarget('5106')).toBe('http://localhost:5106');
  });

  it('uses the API default port when API_PORT is not configured', () => {
    expect(resolveApiProxyTarget(undefined)).toBe('http://localhost:3000');
  });

  it('rejects malformed API_PORT values instead of silently proxying elsewhere', () => {
    expect(() => resolveApiProxyTarget('0')).toThrow('API_PORT doit être compris entre 1 et 65535.');
    expect(() => resolveApiProxyTarget('port')).toThrow('API_PORT doit être un entier valide.');
  });
});
