import { describe, expect, test } from 'bun:test';
import { apiValidationPipe } from '../src/api-validation.js';
import { LoginDto } from '../src/modules/auth/dto/login.dto.js';
import { CvInputDto } from '../src/modules/cvs/dto/cv-input.dto.js';

describe('API request validation policy', () => {
  const metadata = { type: 'body' as const, metatype: LoginDto, data: '' };

  test('rejects unknown properties instead of silently accepting them', async () => {
    await expect(
      apiValidationPipe.transform({ identifier: 'user@example.org', password: 'secret', isAdmin: true }, metadata),
    ).rejects.toMatchObject({ status: 400 });
  });

  test('rejects values with the wrong runtime type', async () => {
    await expect(apiValidationPipe.transform({ identifier: 42, password: 'secret' }, metadata)).rejects.toMatchObject({
      status: 400,
    });
  });

  test('transforms and returns a valid DTO', async () => {
    const result = await apiValidationPipe.transform({ identifier: 'user@example.org', password: 'secret' }, metadata);
    expect(result).toBeInstanceOf(LoginDto);
  });

  test('rejects blank required CV fields and unknown nested branch fields', async () => {
    const cv = {
      firstName: 'Tiana',
      lastName: 'Rabe',
      address: 'Antananarivo',
      birthDate: '1990-01-01',
      phone: '   ',
      email: 'tiana@example.org',
      province: 'Analamanga',
      area: 'Avaradrano',
      fivondronana: 'Antananarivo',
      branches: [{ name: 'Tily', group: 'Mpanazava', isOfficial: true }],
    };
    const cvMetadata = { type: 'body' as const, metatype: CvInputDto, data: '' };

    await expect(apiValidationPipe.transform(cv, cvMetadata)).rejects.toMatchObject({ status: 400 });
    await expect(apiValidationPipe.transform({ ...cv, phone: '0341234567' }, cvMetadata)).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      apiValidationPipe.transform(
        { ...cv, phone: '0341234567', branches: [], extraContact: Array.from({ length: 101 }, () => 'x') },
        cvMetadata,
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
});
