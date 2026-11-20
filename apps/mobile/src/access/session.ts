export type SessionUser = {
  id: string;
  accountName: string;
  email: string | null;
  phone: string | null;
  hasAvatar: boolean;
};
export type Session = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: SessionUser;
};

export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired');
  }
}

export interface SessionStore {
  read(): Promise<string | null>;
  write(token: string): Promise<void>;
  readRefreshToken(): Promise<string | null>;
  writeRefreshToken(token: string): Promise<void>;
  clear(): Promise<void>;
}

export async function restoreSession(
  store: SessionStore,
  getCurrentUser: (token: string) => Promise<SessionUser>,
  refresh: (token: string) => Promise<Session>,
): Promise<Session | null> {
  const accessToken = await store.read();
  if (!accessToken) return null;
  const refreshToken = await store.readRefreshToken();
  if (!refreshToken) {
    await store.clear();
    return null;
  }
  try {
    return { accessToken, refreshToken, expiresIn: 900, user: await getCurrentUser(accessToken) };
  } catch (error) {
    if (!(error instanceof SessionExpiredError)) throw error;
    try {
      const renewed = await refresh(refreshToken);
      await store.write(renewed.accessToken);
      await store.writeRefreshToken(renewed.refreshToken);
      return renewed;
    } catch (refreshError) {
      if (!(refreshError instanceof SessionExpiredError)) throw refreshError;
      await store.clear();
      return null;
    }
  }
}

export async function endSession(
  store: SessionStore,
  refreshToken: string | null,
  revoke: (value: string) => Promise<void>,
): Promise<void> {
  await store.clear();
  if (refreshToken) await revoke(refreshToken);
}
