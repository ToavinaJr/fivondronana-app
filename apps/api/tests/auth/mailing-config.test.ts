import { describe, expect, it } from 'bun:test';
import { isMailingActive } from '../../src/modules/auth/mailing-config.js';

describe('mailing configuration', () => {
  it('defaults to active when IS_MAILING_ACTIVE is unset', () => {
    expect(isMailingActive({})).toBe(true);
  });

  it('is active for any value other than the literal string "false"', () => {
    expect(isMailingActive({ IS_MAILING_ACTIVE: 'true' })).toBe(true);
    expect(isMailingActive({ IS_MAILING_ACTIVE: '' })).toBe(true);
    expect(isMailingActive({ IS_MAILING_ACTIVE: 'False' })).toBe(true);
  });

  it('is inactive only when explicitly set to "false"', () => {
    expect(isMailingActive({ IS_MAILING_ACTIVE: 'false' })).toBe(false);
  });
});
