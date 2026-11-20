import { AuthRequestError } from './auth-client';

export type AdminRequestOptions = {
  method?: string;
  body?: unknown;
  csrfToken?: string;
  fetcher?: typeof fetch;
};

export type AdminArchive = {
  id: string;
  title: string;
  description: string;
  category: string;
  year: number | null;
  fileName: string;
  contentType: string;
  size: number;
  sha256: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PageResult<T> = {
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export type AdminUser = {
  id: string;
  accountName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  roles: string[];
  entity: { id: string; name: string } | null;
  group: { id: string; name: string } | null;
  responsibilities: { id: string; name: string }[];
  invitationDeliveryStatus: string | null;
  activatedAt: string | null;
};

export type AdminEntity = {
  id: string;
  name: string;
  isActive: boolean;
  groups: { id: string; name: string; isActive: boolean }[];
};

export type AdminResponsibility = { id: string; name: string; isActive: boolean };

export type AdminContact = {
  id: string;
  name: string;
  responsibility: string;
  groupLabel: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  kind: 'INTERNAL' | 'EXTERNAL';
  isPublished: boolean;
};

export type AdminConversation = {
  id: string;
  kind: 'GENERAL' | 'ENTITY' | 'CUSTOM';
  title: string;
  entityId: string | null;
  isActive: boolean;
  entities: { entity: { id: string; name: string } }[];
  members: { user: { id: string; accountName: string } }[];
};

export function adminArchiveDownloadUrl(archiveId: string): string {
  return `${import.meta.env.VITE_API_URL ?? ''}/api/admin/archives/${encodeURIComponent(archiveId)}/download`;
}

export async function adminRequest<T>(path: string, options: AdminRequestOptions = {}): Promise<T> {
  if (!/^[a-zA-Z0-9/_-]+(?:\?[a-zA-Z0-9%&=+_-]*)?$/.test(path) || path.startsWith('/')) {
    throw new Error('Chemin API invalide.');
  }

  const isFormData = options.body instanceof FormData;
  const headers = new Headers();
  if (options.body !== undefined && !isFormData) headers.set('Content-Type', 'application/json');
  if (options.csrfToken) headers.set('X-CSRF-Token', options.csrfToken);
  const response = await (options.fetcher ?? fetch)(`${import.meta.env.VITE_API_URL ?? ''}/api/admin/${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers,
    ...(options.body === undefined
      ? {}
      : { body: isFormData ? (options.body as FormData) : JSON.stringify(options.body) }),
  });

  if (!response.ok) {
    let message = 'Une erreur est survenue. Veuillez réessayer.';
    try {
      const payload = (await response.json()) as { message?: string | string[] };
      if (typeof payload.message === 'string') message = payload.message;
      else if (Array.isArray(payload.message)) message = payload.message.join(' ');
    } catch {
      // Preserve a useful request error for empty and non-JSON responses.
    }
    throw new AuthRequestError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
