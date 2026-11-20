import type { PersonalCv } from '../access/auth-api';
import { SessionExpiredError } from '../access/session';
import { directoryErrorMessage } from './directory-errors';

export type LeaderSummary = {
  id: string;
  accountName: string;
  entity: { id: string; name: string };
  group: { id: string; name: string };
  responsibilities: string[];
  hasAvatar: boolean;
  hasCv: boolean;
};
export type PageMetadata = { page: number; pageSize: number; total: number; totalPages: number };
export type Page<T> = { data: T[]; pagination: PageMetadata };
export type LeaderFacets = {
  entities: Array<{ id: string; name: string }>;
  groups: Array<{ id: string; name: string; entityId: string }>;
  responsibilities: Array<{ id: string; name: string }>;
};
export type LeaderFilters = {
  page?: number;
  pageSize?: number;
  q?: string;
  entityId?: string;
  groupId?: string;
  responsibilityId?: string;
};

export async function listLeaders(
  accessToken: string,
  filters: LeaderFilters,
  baseUrl: string,
): Promise<Page<LeaderSummary>> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    const normalized = typeof value === 'string' ? value.trim() : value;
    if (normalized !== undefined && normalized !== '') query.set(key, String(normalized));
  }
  const payload = await request(`${trimSlash(baseUrl)}/leaders?${query}`, accessToken);
  if (!isRecord(payload) || !Array.isArray(payload.data) || !isRecord(payload.pagination)) return invalidResponse();
  const parsedData = payload.data.map(parseLeaderSummary);
  const pagination = parsePagination(payload.pagination);
  if (parsedData.some((item) => item === null) || !pagination) return invalidResponse();
  return { data: parsedData as LeaderSummary[], pagination };
}

export async function getLeaderFacets(accessToken: string, baseUrl: string): Promise<LeaderFacets> {
  const payload = await request(`${trimSlash(baseUrl)}/leaders/facets`, accessToken);
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.entities) ||
    !Array.isArray(payload.groups) ||
    !Array.isArray(payload.responsibilities)
  )
    return invalidResponse();
  const entities = payload.entities.map((item) => parseNamedItem(item, false));
  const groups = payload.groups.map((item) => parseNamedItem(item, true));
  const responsibilities = payload.responsibilities.map((item) => parseNamedItem(item, false));
  if (!entities.every(Boolean) || !groups.every(Boolean) || !responsibilities.every(Boolean)) return invalidResponse();
  return {
    entities: entities as LeaderFacets['entities'],
    groups: groups as LeaderFacets['groups'],
    responsibilities: responsibilities as LeaderFacets['responsibilities'],
  };
}

export async function getLeaderCv(accessToken: string, userId: string, baseUrl: string): Promise<PersonalCv> {
  return parseCv(await request(`${trimSlash(baseUrl)}/cvs/responsibles/${encodeURIComponent(userId)}`, accessToken));
}

export async function listResponsibleCvs(
  accessToken: string,
  filters: Pick<LeaderFilters, 'page' | 'pageSize'>,
  baseUrl: string,
): Promise<Page<PersonalCv>> {
  const query = new URLSearchParams();
  query.set('page', String(filters.page ?? 1));
  query.set('pageSize', String(filters.pageSize ?? 20));
  const payload = await request(`${trimSlash(baseUrl)}/cvs/responsibles?${query}`, accessToken);
  if (!isRecord(payload) || !Array.isArray(payload.data) || !isRecord(payload.pagination)) return invalidResponse();
  const data = payload.data.map((item) => {
    try {
      return parseCv(item);
    } catch {
      return null;
    }
  });
  const pagination = parsePagination(payload.pagination);
  if (!data.every(Boolean) || !pagination) return invalidResponse();
  return { data: data as PersonalCv[], pagination };
}

async function request(url: string, token: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new Error('Tsy tratra ny mpizara. Hamarino ny tambajotra.');
  }
  if (response.status === 401) throw new SessionExpiredError();
  if (!response.ok) throw new Error(directoryErrorMessage(response.status));
  try {
    return await response.json();
  } catch {
    return invalidResponse();
  }
}

function parseLeaderSummary(value: unknown): LeaderSummary | null {
  if (!isRecord(value) || !isRecord(value.entity) || !isRecord(value.group) || !Array.isArray(value.responsibilities))
    return null;
  if (
    !isString(value.id) ||
    !isString(value.accountName) ||
    !isString(value.entity.id) ||
    !isString(value.entity.name) ||
    !isString(value.group.id) ||
    !isString(value.group.name) ||
    !value.responsibilities.every(isString) ||
    typeof value.hasAvatar !== 'boolean' ||
    typeof value.hasCv !== 'boolean'
  )
    return null;
  return {
    id: value.id,
    accountName: value.accountName,
    entity: { id: value.entity.id, name: value.entity.name },
    group: { id: value.group.id, name: value.group.name },
    responsibilities: value.responsibilities,
    hasAvatar: value.hasAvatar,
    hasCv: value.hasCv,
  };
}

function parseNamedItem(value: unknown, withEntity: true): LeaderFacets['groups'][number] | null;
function parseNamedItem(
  value: unknown,
  withEntity: false,
): LeaderFacets['entities'][number] | LeaderFacets['responsibilities'][number] | null;
function parseNamedItem(value: unknown, withEntity: boolean) {
  if (!isRecord(value) || !isString(value.id) || !isString(value.name)) return null;
  if (withEntity) return isString(value.entityId) ? { id: value.id, name: value.name, entityId: value.entityId } : null;
  return { id: value.id, name: value.name };
}

function parseCv(value: unknown): PersonalCv {
  if (
    !isRecord(value) ||
    !isString(value.firstName) ||
    !isString(value.lastName) ||
    !isString(value.address) ||
    !isString(value.birthDate) ||
    !isString(value.phone) ||
    !isString(value.email) ||
    !isString(value.province) ||
    !isString(value.area) ||
    !isString(value.fivondronana)
  )
    return invalidResponse();
  if (
    !(value.birthPlace === null || isString(value.birthPlace)) ||
    !(value.facebook === null || isString(value.facebook)) ||
    !isStringArray(value.extraPersonal) ||
    !isStringArray(value.extraContact) ||
    !Array.isArray(value.branches) ||
    !Array.isArray(value.activities)
  )
    return invalidResponse();
  if (
    value.template !== undefined &&
    value.template !== null &&
    value.template !== 'Tily' &&
    value.template !== 'Mpanazava'
  )
    return invalidResponse();
  const branches = value.branches.map((row) => {
    if (!isRecord(row) || !isString(row.name) || !isString(row.group)) return null;
    return {
      name: row.name,
      group: row.group,
      project: optionalString(row.project),
      startedAt: optionalString(row.startedAt),
      endedAt: optionalString(row.endedAt),
    };
  });
  const activities = value.activities.map((row) => {
    if (!isRecord(row)) return null;
    return {
      name: optionalString(row.name),
      responsibility: optionalString(row.responsibility),
      description: optionalString(row.description),
      date: optionalString(row.date),
    };
  });
  if (!branches.every(Boolean) || !activities.every(Boolean)) return invalidResponse();
  return {
    firstName: value.firstName,
    lastName: value.lastName,
    address: value.address,
    birthDate: value.birthDate,
    birthPlace: value.birthPlace,
    phone: value.phone,
    email: value.email,
    facebook: value.facebook,
    province: value.province,
    area: value.area,
    fivondronana: value.fivondronana,
    extraPersonal: value.extraPersonal,
    extraContact: value.extraContact,
    branches: branches as NonNullable<(typeof branches)[number]>[],
    activities: activities as NonNullable<(typeof activities)[number]>[],
    template: value.template as PersonalCv['template'],
  };
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

function optionalString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (!isString(value)) return invalidResponse();
  return value;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isString(value: unknown): value is string {
  return typeof value === 'string';
}
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}
function trimSlash(value: string): string {
  return value.replace(/\/$/, '');
}
function invalidResponse(): never {
  throw new Error('Valin-teny tsy araka ny tokony ho izy.');
}
