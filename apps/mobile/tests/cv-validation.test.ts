import { describe, expect, it } from 'bun:test';
import { isValidDateOnly, validateCv } from '../src/main/cv-validation';

describe('CV date validation', () => {
  it('accepts valid calendar dates including leap days', () => {
    expect(isValidDateOnly('1990-01-01')).toBe(true);
    expect(isValidDateOnly('2024-02-29')).toBe(true);
  });

  it('rejects impossible dates and non-ISO date strings', () => {
    expect(isValidDateOnly('2026-02-30')).toBe(false);
    expect(isValidDateOnly('2023-02-29')).toBe(false);
    expect(isValidDateOnly('1990-1-01')).toBe(false);
    expect(isValidDateOnly('')).toBe(false);
  });

  it('returns errors keyed to the fields that need correction', () => {
    const errors = validateCv({
      firstName: '',
      lastName: ' ',
      address: '',
      birthDate: '2026-02-30',
      phone: '',
      email: '',
      province: '',
      area: '',
      fivondronana: '',
      branches: [{ name: '', group: ' ' }],
      activities: [{ date: 'not-a-date' }],
    });

    expect(errors.firstName).toBeDefined();
    expect(errors.lastName).toBeDefined();
    expect(errors.birthDate).toBeDefined();
    expect(errors['branches.0.name']).toBeDefined();
    expect(errors['branches.0.group']).toBeDefined();
    expect(errors['activities.0.date']).toBeDefined();
    expect(errors.address).toBeDefined();
    expect(Object.keys(errors)).toHaveLength(12);
  });
});
