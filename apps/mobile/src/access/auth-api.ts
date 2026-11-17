import Constants from 'expo-constants';

declare const process: { env: { EXPO_PUBLIC_API_URL?: string } };

export type AuthUser = { id: string; accountName: string; email: string | null; phone: string | null };
export type AuthSession = { accessToken: string; user: AuthUser };

function getApiBaseUrl(): string {
  const url = new URL(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api');
  const isLoopback = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  const expoHostUri = Constants.expoConfig?.hostUri;
  if (isLoopback && expoHostUri) {
    try {
      const expoHost = new URL(`http://${expoHostUri}`).hostname;
      if (expoHost && !['localhost', '127.0.0.1', '::1'].includes(expoHost)) url.hostname = expoHost;
    } catch {
      // Keep the configured host when Expo does not expose a usable development host.
    }
  }
  return url.toString().replace(/\/$/, '');
}

const apiBaseUrl = getApiBaseUrl();

export async function login(identifier: string, password: string): Promise<AuthSession> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
  } catch {
    throw new Error('Tsy tratra ny mpizara. Hamarino fa mandeha ny API (bun run dev) ary ampiasao ny adiresy IP an’ny PC raha tsy mifandray amin’ny Expo Go ianao.');
  }

  if (response.status === 401) throw new Error('Tsy marina ny mailaka na ny teny miafina, na tsy miasa ilay kaonty.');
  if (!response.ok) throw new Error('Nisy olana teo amin’ny fidirana. Andramo indray afaka kelikely.');
  return response.json() as Promise<AuthSession>;
}

export async function logout(accessToken: string): Promise<void> {
  await fetch(`${apiBaseUrl}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => undefined);
}

export async function changePassword(accessToken: string, currentPassword: string, newPassword: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/auth/password`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  }).catch(() => { throw new Error('Tsy tratra ny mpizara. Hamarino ny tambajotra.'); });
  if (response.status === 401) throw new Error('Tsy marina ny teny miafina ankehitriny.');
  if (response.status === 400) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? 'Tsy ekena ilay teny miafina vaovao.');
  }
  if (!response.ok) throw new Error('Tsy voaova ny teny miafina. Andramo indray.');
}

export type CvBranch = { id?: string; name: string; group: string; project: string; startedAt: string; endedAt: string };
export type CvActivity = { id?: string; name: string; responsibility: string; description: string; date: string };
export type PersonalCv = {
  id?: string; firstName: string; lastName: string; address: string; birthDate: string; birthPlace: string | null;
  phone: string; email: string; facebook: string | null; province: string; area: string; fivondronana: string;
  extraPersonal: string[]; extraContact: string[]; branches: CvBranch[]; activities: CvActivity[];
};

export async function getMyCv(accessToken: string): Promise<PersonalCv | null> {
  const response = await fetch(`${apiBaseUrl}/cvs/me`, { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => { throw new Error('Tsy tratra ny mpizara. Hamarino ny tambajotra.'); });
  if (!response.ok) throw new Error('Tsy azo vakina ny CV. Andramo indray.');
  return response.json() as Promise<PersonalCv | null>;
}

export async function saveMyCv(accessToken: string, cv: PersonalCv): Promise<PersonalCv> {
  const response = await fetch(`${apiBaseUrl}/cvs/me`, {
    method: 'PUT', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cv),
  }).catch(() => { throw new Error('Tsy tratra ny mpizara. Hamarino ny tambajotra.'); });
  if (response.status === 400) {
    const body = await response.json().catch(() => ({}));
    throw new Error(Array.isArray(body.message) ? body.message.join('\n') : body.message ?? 'Hamarino ireo saha tsy feno.');
  }
  if (!response.ok) throw new Error('Tsy voatahiry ny CV. Andramo indray.');
  return response.json() as Promise<PersonalCv>;
}
