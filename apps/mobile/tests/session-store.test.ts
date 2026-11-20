import { describe, expect, mock, test } from 'bun:test';

const secure = {
  getItemAsync: mock(async (key: string) => (key === 'fivondronana.refresh-token' ? 'refresh-token' : 'token')),
  setItemAsync: mock(async () => {}),
  deleteItemAsync: mock(async () => {}),
};
mock.module('expo-secure-store', () => secure);
const { sessionStore } = await import('../src/access/session-store');

describe('secure session store', () => {
  test('uses Expo SecureStore for token read, write, and clear', async () => {
    secure.getItemAsync.mockClear();
    secure.setItemAsync.mockClear();
    secure.deleteItemAsync.mockClear();
    expect(await sessionStore.read()).toBe('token');
    expect(await sessionStore.readRefreshToken()).toBe('refresh-token');
    await sessionStore.write('token');
    await sessionStore.writeRefreshToken('refresh-token');
    await sessionStore.clear();
    expect(secure.getItemAsync).toHaveBeenCalledWith('fivondronana.access-token');
    expect(secure.getItemAsync).toHaveBeenCalledWith('fivondronana.refresh-token');
    expect(secure.setItemAsync).toHaveBeenCalledWith('fivondronana.access-token', 'token');
    expect(secure.setItemAsync).toHaveBeenCalledWith('fivondronana.refresh-token', 'refresh-token');
    expect(secure.deleteItemAsync).toHaveBeenCalledWith('fivondronana.access-token');
    expect(secure.deleteItemAsync).toHaveBeenCalledWith('fivondronana.refresh-token');
  });

  test('propagates secure storage failures instead of pretending persistence succeeded', async () => {
    secure.setItemAsync.mockRejectedValueOnce(new Error('secure store unavailable'));
    await expect(sessionStore.write('token')).rejects.toThrow('secure store unavailable');
  });
});
