import { SessionExpiredError } from '../access/session';

export type ContactSummary = {
  id: string;
  name: string;
  responsibility: string;
  groupLabel: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  kind: 'INTERNAL' | 'EXTERNAL';
};
export type PageMetadata = { page: number; pageSize: number; total: number; totalPages: number };
export type Page<T> = { data: T[]; pagination: PageMetadata };
export type ContactFilters = { page?: number; pageSize?: number; q?: string };

export async function listContacts(
  accessToken: string,
  filters: ContactFilters,
  baseUrl: string,
): Promise<Page<ContactSummary>> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    const normalized = typeof value === 'string' ? value.trim() : value;
    if (normalized !== undefined && normalized !== '') query.set(key, String(normalized));
  }
  const payload = await request(`${trimSlash(baseUrl)}/contacts?${query}`, accessToken);
  if (!isRecord(payload) || !Array.isArray(payload.data) || !isRecord(payload.pagination)) return invalidResponse();
  const parsedData = payload.data.map(parseContactSummary);
  const pagination = parsePagination(payload.pagination);
  if (parsedData.some((item) => item === null) || !pagination) return invalidResponse();
  return { data: parsedData as ContactSummary[], pagination };
}

async function request(url: string, token: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new Error('Tsy tratra ny mpizara. Hamarino ny tambajotra.');
  }
  if (response.status === 401) throw new SessionExpiredError();
  if (!response.ok) throw new Error('Tsy azo vakina ny angona. Andramo indray.');
  try {
    return await response.json();
  } catch {
    return invalidResponse();
  }
}

function parseContactSummary(value: unknown): ContactSummary | null {
  if (!isRecord(value)) return null;
  const { id, name, responsibility, groupLabel, address, phone, email, description, kind } = value;
  if (
    !isString(id) ||
    !isString(name) ||
    !isString(responsibility) ||
    !isString(groupLabel) ||
    !isString(address) ||
    !isString(phone) ||
    !isString(email) ||
    !isString(description) ||
    (kind !== 'INTERNAL' && kind !== 'EXTERNAL')
  )
    return null;
  return { id, name, responsibility, groupLabel, address, phone, email, description, kind };
}

function parsePagination(value: Record<string, unknown>): PageMetadata | null {
  const fields = ['page', 'pageSize', 'total', 'totalPages'];
  if (!fields.every((field) => Number.isSafeInteger(value[field]) && (value[field] as number) >= 0)) return null;
  if ((value.page as number) < 1 || (value.pageSize as number) < 1) return null;
  return {
    page: value.page as number,
    pageSize: value.pageSize as number,
    total: value.total as number,
    totalPages: value.totalPages as number,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isString(value: unknown): value is string {
  return typeof value === 'string';
}
function trimSlash(value: string): string {
  return value.replace(/\/$/, '');
}
function invalidResponse(): never {
  throw new Error('Valin-teny tsy araka ny tokony ho izy.');
}
