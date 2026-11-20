import 'reflect-metadata';
import { describe, expect, it, mock } from 'bun:test';
import { ContactsService } from '../../src/modules/contacts/contacts.service.js';

describe('contacts service', () => {
  it('lists only published contacts and projects approved fields', async () => {
    const prisma = {
      contact: {
        findMany: mock(async (_args: { where: Record<string, unknown> }) => [
          {
            id: 'contact-1',
            name: 'Filoha koto',
            responsibility: 'Mpitantam-bola foibe',
            groupLabel: 'Tily foibe',
            address: 'Antananarivo',
            phone: '+261 34 20 344 96',
            email: 'filoha.koto@example.org',
            description: 'Mifandraisa amin’ireo.',
            kind: 'INTERNAL',
          },
        ]),
        count: mock(async () => 1),
      },
    };
    const result = await new ContactsService(prisma as never).list({ page: 1, pageSize: 20 });
    expect(result).toEqual({
      data: [
        {
          id: 'contact-1',
          name: 'Filoha koto',
          responsibility: 'Mpitantam-bola foibe',
          groupLabel: 'Tily foibe',
          address: 'Antananarivo',
          phone: '+261 34 20 344 96',
          email: 'filoha.koto@example.org',
          description: 'Mifandraisa amin’ireo.',
          kind: 'INTERNAL',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    expect(prisma.contact.findMany.mock.calls[0]?.[0].where).toEqual({ isPublished: true });
  });

  it('matches the search term across name, responsibility, group, and description, ignoring accents and case', async () => {
    const contact = (overrides: Partial<Record<string, string>>) => ({
      id: overrides.id ?? 'x',
      name: 'x',
      responsibility: 'x',
      groupLabel: 'x',
      address: 'x',
      phone: 'x',
      email: 'x',
      description: 'x',
      kind: 'INTERNAL',
      ...overrides,
    });
    const prisma = {
      contact: {
        findMany: mock(async (_args: { where: Record<string, unknown> }) => [
          contact({ id: 'a', name: 'Filohà koto' }),
          contact({ id: 'b', responsibility: 'TILY FOIBE' }),
          contact({ id: 'c' }),
        ]),
      },
    };
    const service = new ContactsService(prisma as never);
    const byName = await service.list({ page: 1, pageSize: 20, q: '  filoha ' });
    expect(byName.data.map((item) => item.id)).toEqual(['a']);
    const byResponsibility = await service.list({ page: 1, pageSize: 20, q: 'tily foibe' });
    expect(byResponsibility.data.map((item) => item.id)).toEqual(['b']);
    expect(prisma.contact.findMany.mock.calls[0]?.[0].where).toEqual({ isPublished: true });
  });

  it('lists every contact for administration, including drafts', async () => {
    const findMany = mock(async (_args: { orderBy: unknown }) => [{ id: 'a', isPublished: false }]);
    const prisma = { contact: { findMany } };
    const service = new ContactsService(prisma as never);
    const result = await service.listForAdministration();
    expect(result).toEqual([{ id: 'a', isPublished: false }] as never);
    expect(findMany.mock.calls[0]?.[0]).toEqual({ orderBy: [{ name: 'asc' }, { id: 'asc' }] });
  });

  it('rejects updates and publish toggles for a contact that does not exist', async () => {
    const prisma = { contact: { findUnique: mock(async () => null) } };
    const service = new ContactsService(prisma as never);
    await expect(service.update('missing', { name: 'New name' })).rejects.toThrow('Mpifandray tsy hita.');
    await expect(service.setPublished('missing', true)).rejects.toThrow('Mpifandray tsy hita.');
    await expect(service.remove('missing')).rejects.toThrow('Mpifandray tsy hita.');
  });
});
