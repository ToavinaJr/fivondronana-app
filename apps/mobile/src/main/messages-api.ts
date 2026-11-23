import { File } from 'expo-file-system';
import { SessionExpiredError } from '../access/session';
import { directoryErrorMessage } from './directory-errors';

export type ConversationSummary = {
  id: string;
  kind: 'GENERAL' | 'ENTITY' | 'CUSTOM';
  title: string;
  entityId: string | null;
};

export type MessageAttachment = { name: string; contentType: string; size: number };
export type MessageItem = {
  id: string;
  body: string | null;
  createdAt: string;
  sender: { id: string; accountName: string };
  attachment: MessageAttachment | null;
};

export type MessagePage = { messages: MessageItem[]; nextCursor: string | null };

export type PickedAttachment = { uri: string; name: string; mimeType: string };

export async function listConversations(accessToken: string, baseUrl: string): Promise<ConversationSummary[]> {
  const payload = await request(`${trimSlash(baseUrl)}/conversations`, accessToken);
  if (!Array.isArray(payload)) return invalidResponse();
  const conversations = payload.map(parseConversation);
  if (conversations.some((conversation) => conversation === null)) return invalidResponse();
  return conversations as ConversationSummary[];
}

export async function listMessages(
  conversationId: string,
  accessToken: string,
  baseUrl: string,
  cursor?: string,
): Promise<MessagePage> {
  const url = new URL(`${trimSlash(baseUrl)}/conversations/${encodeURIComponent(conversationId)}/messages`);
  if (cursor) url.searchParams.set('cursor', cursor);
  const payload = await request(url.toString(), accessToken);
  if (!isRecord(payload) || !Array.isArray(payload.messages)) return invalidResponse();
  const messages = payload.messages.map(parseMessage);
  if (messages.some((message) => message === null)) return invalidResponse();
  const nextCursor = payload.nextCursor;
  if (nextCursor !== null && typeof nextCursor !== 'string') return invalidResponse();
  return { messages: messages as MessageItem[], nextCursor: nextCursor ?? null };
}

export async function sendMessage(
  conversationId: string,
  accessToken: string,
  baseUrl: string,
  body: string,
  attachment?: PickedAttachment,
): Promise<MessageItem> {
  const form = new FormData();
  if (body) form.append('body', body);
  if (attachment) {
    form.append('file', new File(attachment.uri) as unknown as Blob, attachment.name);
  }
  let response: Response;
  try {
    response = await fetch(`${trimSlash(baseUrl)}/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });
  } catch {
    throw new Error('Tsy tratra ny mpizara. Hamarino ny tambajotra.');
  }
  if (response.status === 401) throw new SessionExpiredError();
  if (!response.ok) throw new Error(directoryErrorMessage(response.status));
  const parsed = parseMessage(await response.json().catch(invalidResponse));
  if (!parsed) return invalidResponse();
  return parsed;
}

export function attachmentDownloadUrl(conversationId: string, messageId: string, baseUrl: string): string {
  return `${trimSlash(baseUrl)}/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/attachment`;
}

export function messagesErrorKind(error: unknown): 'session-expired' | 'retryable' {
  return error instanceof SessionExpiredError ? 'session-expired' : 'retryable';
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

function parseConversation(value: unknown): ConversationSummary | null {
  if (!isRecord(value)) return null;
  const { id, kind, title, entityId } = value;
  if (!isString(id) || (kind !== 'GENERAL' && kind !== 'ENTITY' && kind !== 'CUSTOM') || !isString(title)) return null;
  if (entityId !== null && !isString(entityId)) return null;
  return { id, kind, title, entityId: entityId ?? null };
}

function parseMessage(value: unknown): MessageItem | null {
  if (!isRecord(value)) return null;
  const { id, body, createdAt, sender, attachment } = value;
  if (
    !isString(id) ||
    (body !== null && !isString(body)) ||
    !isString(createdAt) ||
    Number.isNaN(Date.parse(createdAt))
  )
    return null;
  if (!isRecord(sender) || !isString(sender.id) || !isString(sender.accountName)) return null;
  let parsedAttachment: MessageAttachment | null = null;
  if (attachment !== null) {
    if (
      !isRecord(attachment) ||
      !isString(attachment.name) ||
      !isString(attachment.contentType) ||
      !Number.isSafeInteger(attachment.size)
    )
      return null;
    parsedAttachment = { name: attachment.name, contentType: attachment.contentType, size: attachment.size as number };
  }
  return {
    id,
    body: body ?? null,
    createdAt,
    sender: { id: sender.id, accountName: sender.accountName },
    attachment: parsedAttachment,
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
