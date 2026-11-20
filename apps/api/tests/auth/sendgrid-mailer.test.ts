import { afterEach, describe, expect, it } from 'bun:test';
import { ServiceUnavailableException } from '@nestjs/common';
import { SendGridMailer } from '../../src/modules/auth/sendgrid-mailer.js';

describe('SendGrid account activation mailer', () => {
  const savedEnvironment = {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.SENDGRID_FROM_EMAIL,
    backofficeUrl: process.env.BACKOFFICE_URL,
    nodeEnv: process.env.NODE_ENV,
  };
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    restoreEnvironment('SENDGRID_API_KEY', savedEnvironment.apiKey);
    restoreEnvironment('SENDGRID_FROM_EMAIL', savedEnvironment.fromEmail);
    restoreEnvironment('BACKOFFICE_URL', savedEnvironment.backofficeUrl);
    restoreEnvironment('NODE_ENV', savedEnvironment.nodeEnv);
    globalThis.fetch = originalFetch;
  });

  it('sends the activation link through SendGrid using HTTPS in production', async () => {
    process.env.SENDGRID_API_KEY = 'unit-test-api-key';
    process.env.SENDGRID_FROM_EMAIL = 'noreply@example.test';
    process.env.BACKOFFICE_URL = 'https://portal.example.test/base';
    process.env.NODE_ENV = 'production';
    let requestUrl = '';
    let requestBody = '';
    let authorization = '';
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requestUrl = String(input);
      requestBody = String(init?.body ?? '');
      authorization = new Headers(init?.headers).get('Authorization') ?? '';
      return new Response(null, { status: 202 });
    }) as typeof fetch;

    await new SendGridMailer().sendAccountActivation('leader@example.test', 'Leader', 'opaque-one-time-token');

    expect(requestUrl).toBe('https://api.sendgrid.com/v3/mail/send');
    expect(authorization).toBe('Bearer unit-test-api-key');
    expect(requestBody).toContain('https://portal.example.test/activate#token=opaque-one-time-token');
    expect(requestBody).toContain('leader@example.test');
  });

  it('fails closed without exposing provider response details when SendGrid rejects the message', async () => {
    process.env.SENDGRID_API_KEY = 'unit-test-api-key';
    process.env.SENDGRID_FROM_EMAIL = 'noreply@example.test';
    process.env.BACKOFFICE_URL = 'https://portal.example.test';
    globalThis.fetch = (async () =>
      new Response('private provider detail', { status: 500 })) as unknown as typeof fetch;

    await expect(
      new SendGridMailer().sendAccountActivation('leader@example.test', 'Leader', 'token'),
    ).rejects.toMatchObject({ message: 'Impossible d’envoyer le courriel d’activation.' });
  });

  it('requires all sender settings before attempting a delivery', async () => {
    delete process.env.SENDGRID_API_KEY;
    process.env.SENDGRID_FROM_EMAIL = 'noreply@example.test';
    process.env.BACKOFFICE_URL = 'https://portal.example.test';
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response(null, { status: 202 });
    }) as unknown as typeof fetch;

    await expect(new SendGridMailer().sendAccountActivation('leader@example.test', 'Leader', 'token')).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(called).toBe(false);
  });
});

function restoreEnvironment(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
