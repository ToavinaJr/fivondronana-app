import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateArchiveDto } from '../../src/modules/archives/dto/create-archive.dto.js';

describe('CreateArchiveDto', () => {
  it('coerces the multipart/form-data year field from a string to a number', async () => {
    const dto = plainToInstance(CreateArchiveDto, { title: 'Titre', category: 'Tantara', year: '2026' });

    expect(dto.year).toBe(2026);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('still rejects a year outside the allowed range once converted', async () => {
    const dto = plainToInstance(CreateArchiveDto, { title: 'Titre', category: 'Tantara', year: '1899' });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'year')).toBe(true);
  });

  it('allows the optional year to be entirely absent', async () => {
    const dto = plainToInstance(CreateArchiveDto, { title: 'Titre', category: 'Tantara' });

    expect(dto.year).toBeUndefined();
    expect(await validate(dto)).toHaveLength(0);
  });
});
