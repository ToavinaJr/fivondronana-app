import Constants from 'expo-constants';
import { getApiErrorMessage } from './api-errors';
import { readCvResponse } from './cv-response';
import { SessionExpiredError } from './session';

declare const process: { env: { EXPO_PUBLIC_API_URL?: string } };
declare const __DEV__: boolean;

export type AuthUser = {
  id: string;
  accountName: string;
  email: string | null;
  phone: string | null;
  hasAvatar: boolean;
  isResponsible: boolean;
};
export type AuthSession = { accessToken: string; refreshToken: string; expiresIn: number; user: AuthUser };

export function resolveApiBaseUrl(
  configuredUrl = 'http://localhost:3000/api',
  expoHostUri?: string,
  allowInsecureRemote = false,
): string {
  const url = new URL(configuredUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('The mobile API URL must use HTTP or HTTPS.');
  if (isLoopbackHost(url.hostname) && expoHostUri) {
    try {
      const expoHost = new URL(`http://${expoHostUri}`).hostname;
      if (expoHost && !isLoopbackHost(expoHost)) url.hostname = expoHost;
    } catch {
      // Keep the configured host when Expo does not expose a usable development host.
    }
  }
  if (url.protocol === 'http:' && !isLoopbackHost(url.hostname) && !allowInsecureRemote) {
    throw new Error('The mobile API must use HTTPS outside local development.');
  }
  return url.toString().replace(/\/$/, '');
}

function isLoopbackHost(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname.toLowerCase());
}

const apiBaseUrl = resolveApiBaseUrl(
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api',
  Constants.expoConfig?.hostUri,
  typeof __DEV__ !== 'undefined' && __DEV__,
);

export function getConfiguredApiBaseUrl(): string {
  return apiBaseUrl;
}

export async function login(identifier: string, password: string, rememberMe: boolean): Promise<AuthSession> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password, rememberMe }),
    });
  } catch {
    throw new Error(
      'Tsy tratra ny mpizara. Hamarino fa mandeha ny API (bun run dev) ary ampiasao ny adiresy IP an’ny PC raha tsy mifandray amin’ny Expo Go ianao.',
    );
  }

  if (response.status === 401) throw new Error('Tsy marina ny mailaka na ny teny miafina, na tsy miasa ilay kaonty.');
  if (!response.ok) throw new Error('Nisy olana teo amin’ny fidirana. Andramo indray afaka kelikely.');
  return response.json() as Promise<AuthSession>;
}

export async function refreshSession(refreshToken: string): Promise<AuthSession> {
  const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => {
    throw new Error('Tsy tratra ny mpizara. Hamarino ny tambajotra.');
  });
  if (response.status === 401) throw new SessionExpiredError();
  if (!response.ok) throw new Error('Tsy azo havaozina ny session. Andramo indray.');
  return response.json() as Promise<AuthSession>;
}

export async function requestPasswordRecovery(email: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/auth/password-recovery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  }).catch(() => {
    throw new Error('Tsy tratra ny mpizara. Hamarino ny tambajotra.');
  });
  if (!response.ok) throw new Error('Tsy tontosa ny fangatahana. Andramo indray afaka kelikely.');
}

export async function logout(refreshToken: string): Promise<void> {
  await fetch(`${apiBaseUrl}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => undefined);
}

export async function getCurrentUser(accessToken: string): Promise<AuthUser> {
  const response = await fetch(`${apiBaseUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => {
    throw new Error('Tsy tratra ny mpizara. Hamarino ny tambajotra.');
  });
  if (response.status === 401) throw new SessionExpiredError();
  if (!response.ok) throw new Error('Tsy azo hamarinina ny session. Andramo indray.');
  return response.json() as Promise<AuthUser>;
}

export async function changePassword(accessToken: string, currentPassword: string, newPassword: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/auth/password`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  }).catch(() => {
    throw new Error('Tsy tratra ny mpizara. Hamarino ny tambajotra.');
  });
  if (response.status === 401) throw new Error('Tsy marina ny teny miafina ankehitriny.');
  if (response.status === 400) {
    const body = await response.json().catch(() => ({}));
    throw new Error(getApiErrorMessage(body, 'Tsy ekena ilay teny miafina vaovao.'));
  }
  if (!response.ok) throw new Error('Tsy voaova ny teny miafina. Andramo indray.');
}

export async function updateAccountName(accessToken: string, accountName: string): Promise<AuthUser> {
  const response = await fetch(`${apiBaseUrl}/users/me`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountName }),
  }).catch(() => {
    throw new Error('Tsy tratra ny mpizara. Hamarino ny tambajotra.');
  });
  if (response.status === 401) throw new SessionExpiredError();
  if (response.status === 400) {
    const body = await response.json().catch(() => ({}));
    throw new Error(getApiErrorMessage(body, 'Tsy ekena ilay anarana.'));
  }
  if (!response.ok) throw new Error('Tsy voaova ny anarana. Andramo indray.');
  return response.json() as Promise<AuthUser>;
}

export type PickedAvatar = { uri: string; name: string; mimeType: string };

export async function uploadAvatar(accessToken: string, avatar: PickedAvatar): Promise<void> {
  const form = new FormData();
  form.append('file', { uri: avatar.uri, name: avatar.name, type: avatar.mimeType } as unknown as Blob);
  const response = await fetch(`${apiBaseUrl}/users/me/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  }).catch(() => {
    throw new Error('Tsy tratra ny mpizara. Hamarino ny tambajotra.');
  });
  if (response.status === 401) throw new SessionExpiredError();
  if (response.status === 400) {
    const body = await response.json().catch(() => ({}));
    throw new Error(getApiErrorMessage(body, 'Sary JPEG na PNG ihany no azo ampiasaina.'));
  }
  if (!response.ok) throw new Error('Tsy voatahiry ny sary. Andramo indray.');
}

export async function removeAvatar(accessToken: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/users/me/avatar`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => {
    throw new Error('Tsy tratra ny mpizara. Hamarino ny tambajotra.');
  });
  if (response.status === 401) throw new SessionExpiredError();
  if (!response.ok) throw new Error('Tsy voaesotra ny sary. Andramo indray.');
}

export function myAvatarUrl(): string {
  return `${apiBaseUrl}/users/me/avatar`;
}

export function leaderAvatarUrl(leaderId: string): string {
  return `${apiBaseUrl}/leaders/${encodeURIComponent(leaderId)}/avatar`;
}

export type CvBranch = {
  id?: string;
  name: string;
  group: string;
  project: string;
  startedAt: string;
  endedAt: string;
};
export type CvActivity = { id?: string; name: string; responsibility: string; description: string; date: string };
export type PersonalCv = {
  id?: string;
  firstName: string;
  lastName: string;
  address: string;
  birthDate: string;
  birthPlace: string | null;
  phone: string;
  email: string;
  facebook: string | null;
  province: string;
  area: string;
  fivondronana: string;
  extraPersonal: string[];
  extraContact: string[];
  branches: CvBranch[];
  activities: CvActivity[];
  template?: 'Tily' | 'Mpanazava' | null;
};

export async function getMyCv(accessToken: string): Promise<PersonalCv | null> {
  const response = await fetch(`${apiBaseUrl}/cvs/me`, { headers: { Authorization: `Bearer ${accessToken}` } }).catch(
    () => {
      throw new Error('Tsy tratra ny mpizara. Hamarino ny tambajotra.');
    },
  );
  if (!response.ok) throw new Error('Tsy azo vakina ny CV. Andramo indray.');
  return readCvResponse(response, true);
}

export async function saveMyCv(accessToken: string, cv: PersonalCv): Promise<PersonalCv> {
  const response = await fetch(`${apiBaseUrl}/cvs/me`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cv),
  }).catch(() => {
    throw new Error('Tsy tratra ny mpizara. Hamarino ny tambajotra.');
  });
  if (response.status === 400) {
    const body = await response.json().catch(() => ({}));
    throw new Error(getApiErrorMessage(body, 'Hamarino ireo saha tsy feno.'));
  }
  if (!response.ok) throw new Error('Tsy voatahiry ny CV. Andramo indray.');
  return readCvResponse(response, false);
}
