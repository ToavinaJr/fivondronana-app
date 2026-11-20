import * as SecureStore from 'expo-secure-store';

const SESSION_TOKEN_KEY = 'fivondronana.access-token';
const REFRESH_TOKEN_KEY = 'fivondronana.refresh-token';

export interface SessionStore {
  read(): Promise<string | null>;
  write(token: string): Promise<void>;
  readRefreshToken(): Promise<string | null>;
  writeRefreshToken(token: string): Promise<void>;
  clear(): Promise<void>;
}

export const sessionStore: SessionStore = {
  read: () => SecureStore.getItemAsync(SESSION_TOKEN_KEY),
  write: (token) => SecureStore.setItemAsync(SESSION_TOKEN_KEY, token),
  readRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  writeRefreshToken: (token) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token),
  clear: async () => {
    await Promise.all([SecureStore.deleteItemAsync(SESSION_TOKEN_KEY), SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)]);
  },
};
