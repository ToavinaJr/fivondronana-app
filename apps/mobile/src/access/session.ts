export type SessionUser = { id: string; accountName: string; email: string | null; phone: string | null };
export type Session = { accessToken: string; user: SessionUser };

export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired');
  }
}

export interface SessionStore {
  read(): Promise<string | null>;
  write(token: string): Promise<void>;
  clear(): Promise<void>;
}

export async function restoreSession(
  store: SessionStore,
  getCurrentUser: (token: string) => Promise<SessionUser>,
): Promise<Session | null> {
  const accessToken = await store.read();
  if (!accessToken) return null;
  try {
    return { accessToken, user: await getCurrentUser(accessToken) };
  } catch (error) {
    if (!(error instanceof SessionExpiredError)) throw error;
    await store.clear();
    return null;
  }
}

export async function endSession(
  store: SessionStore,
  token: string | null,
  revoke: (value: string) => Promise<void>,
): Promise<void> {
  await store.clear();
  if (token) await revoke(token);
}
