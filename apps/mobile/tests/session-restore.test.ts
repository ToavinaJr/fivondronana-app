import { describe, expect, test } from 'bun:test';
import { endSession, restoreSession, SessionExpiredError, type SessionStore } from '../src/access/session';

function memoryStore(token: string | null) {
  const state = { token };
  const store: SessionStore = {
    read: async () => state.token,
    write: async (value) => {
      state.token = value;
    },
    clear: async () => {
      state.token = null;
    },
  };
  return { state, store };
}

describe('session restoration', () => {
  test('returns no session when secure storage is empty', async () => {
    const { store } = memoryStore(null);
    const getCurrentUser = async () => {
      throw new Error('must not call');
    };
    expect(await restoreSession(store, getCurrentUser)).toBeNull();
  });

  test('validates a stored token against the current-user endpoint', async () => {
    const { store } = memoryStore('saved-token');
    const user = { id: 'u1', accountName: 'Responsible', email: null, phone: null };
    expect(
      await restoreSession(store, async (token) => {
        expect(token).toBe('saved-token');
        return user;
      }),
    ).toEqual({ accessToken: 'saved-token', user });
  });

  test('clears rejected credentials', async () => {
    const { store, state } = memoryStore('expired');
    expect(
      await restoreSession(store, async () => {
        throw new SessionExpiredError();
      }),
    ).toBeNull();
    expect(state.token).toBeNull();
  });

  test('does not swallow secure-storage read errors', async () => {
    const store: SessionStore = {
      read: async () => {
        throw new Error('secure store unavailable');
      },
      write: async () => {},
      clear: async () => {},
    };
    await expect(
      restoreSession(store, async () => {
        throw new Error('must not call');
      }),
    ).rejects.toThrow('secure store unavailable');
  });

  test('preserves credentials during temporary network failures', async () => {
    const { store, state } = memoryStore('saved-token');
    await expect(
      restoreSession(store, async () => {
        throw new Error('offline');
      }),
    ).rejects.toThrow('offline');
    expect(state.token).toBe('saved-token');
  });

  test('clears the local session before attempting remote revocation', async () => {
    const { store, state } = memoryStore('saved-token');
    await expect(
      endSession(store, 'saved-token', async () => {
        throw new Error('offline');
      }),
    ).rejects.toThrow('offline');
    expect(state.token).toBeNull();
  });
});
