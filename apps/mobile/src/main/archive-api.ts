import { SessionExpiredError } from '../access/session';
import { directoryErrorMessage } from './directory-errors';

export type ArchiveSummary = {
  id: string;
  title: string;
  description: string;
  category: string;
  year: number;
  fileName: string;
  contentType: string;
  size: number;
  createdAt: string;
};

export async function listArchives(accessToken: string, baseUrl: string): Promise<ArchiveSummary[]> {
  const payload = await request(`${trimSlash(baseUrl)}/archives`, accessToken);
  if (!Array.isArray(payload)) return invalidResponse();
  const archives = payload.map(parseArchive);
  if (archives.some((archive) => archive === null)) return invalidResponse();
  return archives as ArchiveSummary[];
}

export async function downloadArchive(
  id: string,
  accessToken: string,
  baseUrl: string,
  expectedSize: number,
): Promise<Uint8Array> {
  const response = await requestResponse(
    `${trimSlash(baseUrl)}/archives/${encodeURIComponent(id)}/download`,
    accessToken,
  );
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== expectedSize)
    throw new Error('Tsy mifanaraka amin’ny haben’ny rakitra voatahiry ny rakitra azo.');
  return bytes;
}

export function archiveErrorKind(error: unknown): 'session-expired' | 'retryable' {
  return error instanceof SessionExpiredError ? 'session-expired' : 'retryable';
}

async function request(url: string, token: string): Promise<unknown> {
  const response = await requestResponse(url, token);
  try {
    return await response.json();
  } catch {
    return invalidResponse();
  }
}

async function requestResponse(url: string, token: string): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new Error('Tsy tratra ny mpizara. Hamarino ny tambajotra.');
  }
  if (response.status === 401) throw new SessionExpiredError();
  if (!response.ok) throw new Error(directoryErrorMessage(response.status));
  return response;
}

function parseArchive(value: unknown): ArchiveSummary | null {
  if (!isRecord(value)) return null;
  const { id, title, description, category, year, fileName, contentType, size, createdAt } = value;
  if (
    !isString(id) ||
    !isString(title) ||
    !isString(description) ||
    !isString(category) ||
    !Number.isSafeInteger(year) ||
    (year as number) < 0 ||
    !isString(fileName) ||
    !isArchiveContentType(contentType) ||
    !Number.isSafeInteger(size) ||
    (size as number) < 1 ||
    !isString(createdAt) ||
    Number.isNaN(Date.parse(createdAt))
  )
    return null;
  return {
    id,
    title,
    description,
    category,
    year: year as number,
    fileName,
    contentType,
    size: size as number,
    createdAt,
  };
}

function isArchiveContentType(value: unknown): value is string {
  return (
    value === 'application/pdf' ||
    value === 'application/msword' ||
    value === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
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
