import { describe, expect, test } from 'bun:test';
import { buildMailUri, buildTelUri } from '../src/main/contact-links';

describe('contact link normalization', () => {
  test('builds a tel: URI from a validated phone number', () => {
    expect(buildTelUri('+261 34 20 344 96')).toBe('tel:+261342034496');
    expect(buildTelUri('034 20 344 96')).toBe('tel:0342034496');
  });

  test('rejects malformed phone numbers', () => {
    expect(buildTelUri('not-a-phone')).toBeNull();
    expect(buildTelUri('')).toBeNull();
    expect(buildTelUri('12')).toBeNull();
  });

  test('builds a mailto: URI from a validated email', () => {
    expect(buildMailUri('filoha.koto@example.org')).toBe('mailto:filoha.koto@example.org');
  });

  test('rejects malformed email addresses', () => {
    expect(buildMailUri('not-an-email')).toBeNull();
    expect(buildMailUri('missing-domain@')).toBeNull();
  });
});
