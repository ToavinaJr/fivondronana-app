import { afterEach, expect, test } from 'bun:test';
import { listContacts } from '../src/main/contact-api';
import { listLeaders } from '../src/main/leader-api';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

for (const [name, list] of [
  ['leaders', listLeaders],
  ['contacts', listContacts],
] as const) {
  for (const [status, message] of [
    [403, 'Tsy manana alalana'],
    [404, 'Tsy hita'],
    [500, 'mpizara'],
  ] as const) {
    test(`${name} explains HTTP ${status} without exposing server details`, async () => {
      globalThis.fetch = (async () => Response.json({ message: 'private server details' }, { status })) as typeof fetch;
      await expect(list('token', {}, 'https://example.test/api')).rejects.toThrow(message);
      await expect(list('token', {}, 'https://example.test/api')).rejects.not.toThrow('private server details');
    });
  }
}
