import { Injectable, NotFoundException } from '@nestjs/common';
import { createPaginatedResponse, getPaginationOffset } from '../../common/pagination.js';
import { PrismaService } from '../database/prisma.service.js';
import type { ContactQueryDto } from './dto/contact-query.dto.js';
import type { ContactResponseDto } from './dto/contact-response.dto.js';
import type { CreateContactDto } from './dto/create-contact.dto.js';
import type { UpdateContactDto } from './dto/update-contact.dto.js';

const PUBLIC_FIELDS = {
  id: true,
  name: true,
  responsibility: true,
  groupLabel: true,
  address: true,
  phone: true,
  email: true,
  description: true,
  kind: true,
} as const;

// Contacts are an admin-curated directory, not a large table, so a bounded scan lets search be
// accent-insensitive (Postgres `contains` is not) without needing the `unaccent` extension.
const SEARCH_SCAN_LIMIT = 1000;

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase();
}

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: ContactQueryDto,
  ): Promise<{ data: ContactResponseDto[]; pagination: ReturnType<typeof createPaginatedResponse>['pagination'] }> {
    const term = query.q?.trim();
    if (!term) {
      const where = { isPublished: true, ...(query.kind ? { kind: query.kind } : {}) };
      const [data, total] = await Promise.all([
        this.prisma.contact.findMany({
          where,
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
          select: PUBLIC_FIELDS,
          ...getPaginationOffset(query),
        }),
        this.prisma.contact.count({ where }),
      ]);
      return createPaginatedResponse(data, total, query);
    }

    const normalizedTerm = normalize(term);
    const candidates = await this.prisma.contact.findMany({
      where: { isPublished: true, ...(query.kind ? { kind: query.kind } : {}) },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: PUBLIC_FIELDS,
      take: SEARCH_SCAN_LIMIT,
    });
    const matches = candidates.filter((contact) =>
      [contact.name, contact.responsibility, contact.groupLabel, contact.description].some((field) =>
        normalize(field).includes(normalizedTerm),
      ),
    );
    const { skip, take } = getPaginationOffset(query);
    return createPaginatedResponse(matches.slice(skip, skip + take), matches.length, query);
  }

  listForAdministration() {
    return this.prisma.contact.findMany({ orderBy: [{ name: 'asc' }, { id: 'asc' }] });
  }

  async create(input: CreateContactDto) {
    return this.prisma.contact.create({ data: input });
  }

  async update(id: string, input: UpdateContactDto) {
    const existing = await this.prisma.contact.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Mpifandray tsy hita.');
    return this.prisma.contact.update({ where: { id }, data: input });
  }

  async setPublished(id: string, isPublished: boolean) {
    const existing = await this.prisma.contact.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Mpifandray tsy hita.');
    return this.prisma.contact.update({ where: { id }, data: { isPublished } });
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.contact.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Mpifandray tsy hita.');
    await this.prisma.contact.delete({ where: { id } });
  }
}
