import { describe, expect, test } from 'bun:test';
import { apiValidationPipe } from '../src/api-validation.js';
import { LoginDto } from '../src/modules/auth/dto/login.dto.js';
import { CvInputDto } from '../src/modules/cvs/dto/cv-input.dto.js';

describe('API request validation policy', () => {
  const metadata = { type: 'body' as const, metatype: LoginDto, data: '' };

  test('rejects unknown properties instead of silently accepting them', async () => {
    expect(
      apiValidationPipe.transform({ identifier: 'user@example.org', password: 'secret', isAdmin: true }, metadata),
    ).rejects.toMatchObject({ status: 400 });
  });

  test('rejects values with the wrong runtime type', async () => {
    expect(apiValidationPipe.transform({ identifier: 42, password: 'secret' }, metadata)).rejects.toMatchObject({
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

    expect(apiValidationPipe.transform(cv, cvMetadata)).rejects.toMatchObject({ status: 400 });
    expect(apiValidationPipe.transform({ ...cv, phone: '0341234567' }, cvMetadata)).rejects.toMatchObject({
      status: 400,
    });
    expect(
      apiValidationPipe.transform(
        { ...cv, phone: '0341234567', branches: [], extraContact: Array.from({ length: 101 }, () => 'x') },
        cvMetadata,
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  test('rejects impossible calendar dates in the required birth date', async () => {
    const cv = {
      firstName: 'Tiana',
      lastName: 'Rabe',
      address: 'Antananarivo',
      birthDate: '1990-02-30',
      phone: '0341234567',
      email: 'tiana@example.org',
      province: 'Analamanga',
      area: 'Avaradrano',
      fivondronana: 'Antananarivo',
    };
    const cvMetadata = { type: 'body' as const, metatype: CvInputDto, data: '' };

    expect(apiValidationPipe.transform(cv, cvMetadata)).rejects.toMatchObject({ status: 400 });
  });

  test('rejects impossible calendar dates in optional CV sections', async () => {
    const cv = {
      firstName: 'Tiana',
      lastName: 'Rabe',
      address: 'Antananarivo',
      birthDate: '1990-02-28',
      phone: '0341234567',
      email: 'tiana@example.org',
      province: 'Analamanga',
      area: 'Avaradrano',
      fivondronana: 'Antananarivo',
      branches: [{ name: 'Tily', group: 'Mpanazava', startedAt: '2026-02-30' }],
    };
    const cvMetadata = { type: 'body' as const, metatype: CvInputDto, data: '' };

    expect(apiValidationPipe.transform(cv, cvMetadata)).rejects.toMatchObject({ status: 400 });
  });

  test('accepts Malagasy diacritics and text exactly at the documented CV length limit', async () => {
    const cv = {
      firstName: 'Tiana',
      lastName: 'Rabe',
      address: 'Antananarivo',
      birthDate: '1990-02-28',
      phone: '0341234567',
      email: 'tiana@example.org',
      province: 'Anôsy',
      area: 'Avaradrano',
      fivondronana: 'Antananarivo',
      extraPersonal: ['Fahaiza-manao amin’ny asa sy fiaraha-monina'],
      branches: [{ name: 'Mpanazava', group: 'Tily', project: 'Fampandrosoana ny tanora' }],
      activities: [
        { name: 'Fanompoana', responsibility: 'Mpitarika', description: 'Fandraisana anjara amin’ny fiaraha-monina' },
      ],
    };
    const cvMetadata = { type: 'body' as const, metatype: CvInputDto, data: '' };

    const result = await apiValidationPipe.transform({ ...cv, firstName: 'T'.repeat(100) }, cvMetadata);

    expect(result).toBeInstanceOf(CvInputDto);
    expect(apiValidationPipe.transform({ ...cv, firstName: 'T'.repeat(101) }, cvMetadata)).rejects.toMatchObject({
      status: 400,
    });
  });
});
