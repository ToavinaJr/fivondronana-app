export type BrowserUser = {
  id: string;
  accountName: string;
  email: string | null;
  phone: string | null;
  roles: string[];
};

export type BrowserSession = { user: BrowserUser; csrfToken: string; expiresIn?: number };

type Fetcher = typeof fetch;

export class AuthRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function csrfTokenFromCookie(cookieHeader: string | undefined): string | undefined {
  const prefix = '__Host-fivondronana-csrf=';
  const values = (cookieHeader ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(prefix));
  if (values.length !== 1) return undefined;
  return values[0]?.slice(prefix.length) || undefined;
}

export function tokenFromLocationHash(hash: string): string | undefined {
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
  const query = fragment.includes('?') ? fragment.slice(fragment.indexOf('?') + 1) : fragment;
  const token = new URLSearchParams(query).get('token')?.trim();
  return token || undefined;
}

export async function authRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; csrfToken?: string; fetcher?: Fetcher } = {},
): Promise<T> {
  const fetcher = options.fetcher ?? fetch;
  const headers = new Headers();
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (options.csrfToken) headers.set('X-CSRF-Token', options.csrfToken);
  const response = await fetcher(`${import.meta.env.VITE_API_URL ?? ''}/api/auth/${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });

  if (!response.ok) {
    let message = 'Une erreur est survenue. Veuillez réessayer.';
    try {
      const payload = (await response.json()) as { message?: string | string[] };
      if (typeof payload.message === 'string') message = payload.message;
      if (Array.isArray(payload.message)) message = payload.message.join(' ');
    } catch {
      // Empty and non-JSON API responses still become a useful request error.
    }
    throw new AuthRequestError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function isAdministrator(user: BrowserUser): boolean {
  return user.roles.includes('ADMINISTRATOR');
}
