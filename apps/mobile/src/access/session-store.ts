import * as SecureStore from 'expo-secure-store';

const SESSION_TOKEN_KEY = 'fivondronana.access-token';

export interface SessionStore {
  read(): Promise<string | null>;
  write(token: string): Promise<void>;
  clear(): Promise<void>;
}

export const sessionStore: SessionStore = {
  read: () => SecureStore.getItemAsync(SESSION_TOKEN_KEY),
  write: (token) => SecureStore.setItemAsync(SESSION_TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(SESSION_TOKEN_KEY),
};
