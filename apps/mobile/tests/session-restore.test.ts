import { describe, expect, test } from 'bun:test';
import { endSession, restoreSession, SessionExpiredError, type SessionStore } from '../src/access/session';

function memoryStore(token: string | null) {
  const state = { token, refreshToken: token ? 'saved-refresh-token' : null };
  const store: SessionStore = {
    read: async () => state.token,
    write: async (value) => {
      state.token = value;
    },
    readRefreshToken: async () => state.refreshToken,
    writeRefreshToken: async (value) => {
      state.refreshToken = value;
    },
    clear: async () => {
      state.token = null;
      state.refreshToken = null;
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
    expect(
      await restoreSession(store, getCurrentUser, async () => {
        throw new Error('must not refresh');
      }),
    ).toBeNull();
  });

  test('validates a stored token against the current-user endpoint', async () => {
    const { store } = memoryStore('saved-token');
    const user = { id: 'u1', accountName: 'Responsible', email: null, phone: null };
    expect(
      await restoreSession(
        store,
        async (token) => {
          expect(token).toBe('saved-token');
          return user;
        },
        async () => {
          throw new Error('must not refresh');
        },
      ),
    ).toEqual({ accessToken: 'saved-token', refreshToken: 'saved-refresh-token', user, expiresIn: 900 });
  });

  test('refreshes an expired access token and persists the rotated credentials', async () => {
    const { store, state } = memoryStore('expired');
    const user = { id: 'u1', accountName: 'Responsible', email: null, phone: null };
    expect(
      await restoreSession(
        store,
        async () => {
          throw new SessionExpiredError();
        },
        async (token) => {
          expect(token).toBe('saved-refresh-token');
          return { accessToken: 'new-access', refreshToken: 'new-refresh', expiresIn: 900, user };
        },
      ),
    ).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh', expiresIn: 900, user });
    expect(state).toEqual({ token: 'new-access', refreshToken: 'new-refresh' });
  });

  test('clears credentials when the refresh token is rejected', async () => {
    const { store, state } = memoryStore('expired');
    await expect(
      restoreSession(
        store,
        async () => {
          throw new SessionExpiredError();
        },
        async () => {
          throw new SessionExpiredError();
        },
      ),
    ).resolves.toBeNull();
    expect(state).toEqual({ token: null, refreshToken: null });
  });

  test('does not swallow secure-storage read errors', async () => {
    const store: SessionStore = {
      read: async () => {
        throw new Error('secure store unavailable');
      },
      write: async () => {},
      readRefreshToken: async () => null,
      writeRefreshToken: async () => {},
      clear: async () => {},
    };
    await expect(
      restoreSession(
        store,
        async () => {
          throw new Error('must not call');
        },
        async () => {
          throw new Error('must not call');
        },
      ),
    ).rejects.toThrow('secure store unavailable');
  });

  test('preserves credentials during temporary network failures', async () => {
    const { store, state } = memoryStore('saved-token');
    await expect(
      restoreSession(
        store,
        async () => {
          throw new Error('offline');
        },
        async () => {
          throw new Error('must not refresh');
        },
      ),
    ).rejects.toThrow('offline');
    expect(state.token).toBe('saved-token');
  });

  test('clears the local session before attempting remote revocation', async () => {
    const { store, state } = memoryStore('saved-token');
    await expect(
      endSession(store, 'saved-refresh-token', async (value) => {
        expect(value).toBe('saved-refresh-token');
        throw new Error('offline');
      }),
    ).rejects.toThrow('offline');
    expect(state.token).toBeNull();
  });
});
