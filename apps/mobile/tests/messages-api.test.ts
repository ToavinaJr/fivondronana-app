import { afterEach, describe, expect, test } from 'bun:test';
import { SessionExpiredError } from '../src/access/session';
import { listConversations, listMessages, messagesErrorKind, sendMessage } from '../src/main/messages-api';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('messages API client', () => {
  test('lists and validates visible conversations', async () => {
    let requestedUrl = '';
    let authorization = '';
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      requestedUrl = String(input);
      authorization = new Headers(init?.headers).get('Authorization') ?? '';
      return Response.json([
        { id: 'conv-general', kind: 'GENERAL', title: 'Fifandraisana ankapobeny', entityId: null },
        { id: 'conv-entity', kind: 'ENTITY', title: 'Mavo', entityId: 'entity-1' },
      ]);
    }) as typeof fetch;

    const conversations = await listConversations('access-token', 'https://api.example.org/api/');

    expect(requestedUrl).toBe('https://api.example.org/api/conversations');
    expect(authorization).toBe('Bearer access-token');
    expect(conversations).toHaveLength(2);
    expect(conversations[1]).toMatchObject({ id: 'conv-entity', entityId: 'entity-1' });
  });

  test('paginates message history with a cursor', async () => {
    let requestedUrl = '';
    globalThis.fetch = (async (input: string | URL | Request) => {
      requestedUrl = String(input);
      return Response.json({
        messages: [
          {
            id: 'msg-1',
            body: 'Manao ahoana',
            createdAt: '2026-11-20T08:00:00.000Z',
            sender: { id: 'user-1', accountName: 'Koto' },
            attachment: null,
          },
        ],
        nextCursor: 'msg-0',
      });
    }) as typeof fetch;

    const page = await listMessages('conv-entity', 'token', 'https://api.example.org/api', 'msg-5');

    expect(requestedUrl).toBe('https://api.example.org/api/conversations/conv-entity/messages?cursor=msg-5');
    expect(page.messages[0]?.body).toBe('Manao ahoana');
    expect(page.nextCursor).toBe('msg-0');
  });

  test('sends a text message as multipart form data', async () => {
    let body: FormData | undefined;
    globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      body = init?.body as FormData;
      return Response.json({
        id: 'msg-2',
        body: 'Veloma',
        createdAt: '2026-11-20T08:05:00.000Z',
        sender: { id: 'user-1', accountName: 'Koto' },
        attachment: null,
      });
    }) as typeof fetch;

    const message = await sendMessage('conv-entity', 'token', 'https://api.example.org/api', 'Veloma');

    expect(body?.get('body')).toBe('Veloma');
    expect(message.body).toBe('Veloma');
  });

  test('distinguishes expired-session failures from retryable errors', () => {
    expect(messagesErrorKind(new SessionExpiredError())).toBe('session-expired');
    expect(messagesErrorKind(new Error('offline'))).toBe('retryable');
  });

  test('rejects malformed conversation and message payloads', async () => {
    globalThis.fetch = (async () => Response.json([{ id: 'conv-1' }])) as typeof fetch;
    await expect(listConversations('token', 'https://api.example.org/api')).rejects.toThrow(
      'Valin-teny tsy araka ny tokony ho izy.',
    );

    globalThis.fetch = (async () => new Response(null, { status: 401 })) as typeof fetch;
    await expect(listConversations('token', 'https://api.example.org/api')).rejects.toBeInstanceOf(SessionExpiredError);
  });
});
