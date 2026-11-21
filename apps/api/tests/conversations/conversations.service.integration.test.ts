import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { PostgresFileStorage } from '../../src/modules/archives/postgres-file-storage.js';
import { AuthorizationService } from '../../src/modules/authorization/authorization.service.js';
import { ConversationsService } from '../../src/modules/conversations/conversations.service.js';

const connectionString = process.env.DATABASE_URL_TEST;
const databaseUrl = connectionString ? new URL(connectionString) : null;
if (databaseUrl && !databaseUrl.pathname.toLowerCase().endsWith('_test')) {
  throw new Error('DATABASE_URL_TEST must point to a disposable database whose name ends with _test.');
}

describe.skipIf(!connectionString)('Hafatra conversations', () => {
  let prisma: PrismaClient;
  let service: ConversationsService;
  const suffix = randomUUID();
  const userIds: string[] = [];
  const entityIds: string[] = [];
  const groupIds: string[] = [];
  const conversationIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString as string }) });
    await prisma.$connect();
    const scanner = { scan: mock(async () => {}) };
    service = new ConversationsService(
      prisma as never,
      new AuthorizationService(prisma as never),
      new PostgresFileStorage(prisma as never),
      scanner,
    );
  });

  afterAll(async () => {
    if (conversationIds.length) {
      await prisma.message.deleteMany({ where: { conversationId: { in: conversationIds } } });
      await prisma.conversation.deleteMany({ where: { id: { in: conversationIds } } });
    }
    if (userIds.length) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    if (groupIds.length) await prisma.group.deleteMany({ where: { id: { in: groupIds } } });
    if (entityIds.length) await prisma.entity.deleteMany({ where: { id: { in: entityIds } } });
    await prisma.$disconnect();
  });

  async function makeResponsible(entityName: string) {
    const entity = await prisma.entity.create({ data: { name: `${entityName} ${suffix}` } });
    entityIds.push(entity.id);
    const group = await prisma.group.create({ data: { name: `Group ${suffix}`, entityId: entity.id } });
    groupIds.push(group.id);
    const user = await prisma.user.create({
      data: {
        accountName: `${entityName} responsible ${suffix}`,
        passwordHash: 'test-only-hash',
        roles: { create: [{ role: 'RESPONSIBLE' }] },
        membership: { create: { entityId: entity.id, groupId: group.id } },
      },
    });
    userIds.push(user.id);
    await service.ensureDefaults();
    const conversation = await prisma.conversation.findUniqueOrThrow({ where: { entityId: entity.id } });
    conversationIds.push(conversation.id);
    return { user, entity, conversation };
  }

  it('isolates entity conversations from members of other entities', async () => {
    const a = await makeResponsible('Entity A');
    const b = await makeResponsible('Entity B');

    const visibleToA = await service.listForUser(a.user.id);
    expect(visibleToA.some((c) => c.id === a.conversation.id)).toBe(true);
    expect(visibleToA.some((c) => c.id === b.conversation.id)).toBe(false);

    await expect(service.getMessages(b.conversation.id, a.user.id)).rejects.toThrow(
      'Cette action n’est pas autorisée.',
    );
    await expect(service.sendMessage(b.conversation.id, a.user.id, 'hello')).rejects.toThrow(
      'Cette action n’est pas autorisée.',
    );
  });

  it('lets members of an entity exchange and read text messages in their own conversation', async () => {
    const a = await makeResponsible('Entity C');
    const sent = await service.sendMessage(a.conversation.id, a.user.id, '  Manao ahoana  ');
    expect(sent.body).toBe('Manao ahoana');
    const { messages } = await service.getMessages(a.conversation.id, a.user.id);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.sender.id).toBe(a.user.id);
    expect(messages[0]?.attachment).toBeNull();
  });

  it('gives every responsible access to the general conversation regardless of entity', async () => {
    const a = await makeResponsible('Entity D');
    const b = await makeResponsible('Entity E');
    const general = await prisma.conversation.findUniqueOrThrow({ where: { isGeneralSingleton: true } });
    conversationIds.push(general.id);

    await service.sendMessage(general.id, a.user.id, 'From A');
    await service.sendMessage(general.id, b.user.id, 'From B');
    const { messages } = await service.getMessages(general.id, b.user.id);
    expect(messages.map((m) => m.body)).toEqual(expect.arrayContaining(['From A', 'From B']));
  });

  it('rejects an empty message with no text and no attachment', async () => {
    const a = await makeResponsible('Entity F');
    await expect(service.sendMessage(a.conversation.id, a.user.id, undefined)).rejects.toThrow(
      'Tsy maintsy misy soratra na rakitra ampidirina.',
    );
  });

  it('stores and serves an image attachment, verified by checksum', async () => {
    const a = await makeResponsible('Entity G');
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from('fixture-bytes'),
    ]);
    const sent = await service.sendMessage(a.conversation.id, a.user.id, undefined, {
      buffer: png,
      originalname: 'photo.png',
      size: png.byteLength,
    });
    expect(sent.attachment?.contentType).toBe('image/png');
    const file = await service.getAttachment(a.conversation.id, sent.id, a.user.id);
    expect(file.data).toEqual(png);
    expect(file.name).toBe('photo.png');
  });

  it('hides a disabled conversation from members and rejects sending to it', async () => {
    const a = await makeResponsible('Entity H');
    await service.setActive(a.conversation.id, false);
    const visible = await service.listForUser(a.user.id);
    expect(visible.some((c) => c.id === a.conversation.id)).toBe(false);
    await expect(service.getMessages(a.conversation.id, a.user.id)).rejects.toThrow('Tsy hita ny resaka.');
    await expect(service.sendMessage(a.conversation.id, a.user.id, 'still trying')).rejects.toThrow(
      'Tsy hita ny resaka.',
    );
  });

  it('refuses a second conversation for an entity that already has one', async () => {
    const a = await makeResponsible('Entity I');
    await expect(service.createEntityConversation('Duplicate', a.entity.id)).rejects.toThrow(
      'Efa manana resaka ity vondrona ity.',
    );
  });

  it('creates a custom conversation visible to members of its entities and to directly added people', async () => {
    const a = await makeResponsible('Entity J');
    const b = await makeResponsible('Entity K');
    const outsider = await makeResponsible('Entity L');

    const custom = await service.createCustomConversation('Komity manokana', [a.entity.id], [b.user.id]);
    conversationIds.push(custom.id);

    const visibleToA = await service.listForUser(a.user.id);
    expect(visibleToA.some((c) => c.id === custom.id)).toBe(true);
    const visibleToB = await service.listForUser(b.user.id);
    expect(visibleToB.some((c) => c.id === custom.id)).toBe(true);
    const visibleToOutsider = await service.listForUser(outsider.user.id);
    expect(visibleToOutsider.some((c) => c.id === custom.id)).toBe(false);

    await expect(service.sendMessage(custom.id, outsider.user.id, 'hello')).rejects.toThrow(
      'Cette action n’est pas autorisée.',
    );
    const sent = await service.sendMessage(custom.id, b.user.id, 'hello from a direct member');
    expect(sent.sender.id).toBe(b.user.id);
  });

  it('rejects creating a custom conversation with no entity and no member', async () => {
    await expect(service.createCustomConversation('Vide', [], [])).rejects.toThrow(
      'Tsy maintsy misafidy vondrona na olona iray farafahakeliny.',
    );
  });

  it('replaces the entities and members of a custom conversation on update', async () => {
    const a = await makeResponsible('Entity M');
    const b = await makeResponsible('Entity N');

    const custom = await service.createCustomConversation('A manage avant', [a.entity.id], []);
    conversationIds.push(custom.id);
    expect(await service.listForUser(a.user.id)).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: custom.id })]),
    );

    await service.updateCustomConversation(custom.id, 'Après', [], [b.user.id]);
    expect((await service.listForUser(a.user.id)).some((c) => c.id === custom.id)).toBe(false);
    expect((await service.listForUser(b.user.id)).some((c) => c.id === custom.id)).toBe(true);
  });

  it('deletes a custom conversation along with its messages and attachment storage', async () => {
    const a = await makeResponsible('Entity O');
    const custom = await service.createCustomConversation('À supprimer', [], [a.user.id]);
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from('to-be-deleted'),
    ]);
    const sent = await service.sendMessage(custom.id, a.user.id, undefined, {
      buffer: png,
      originalname: 'photo.png',
      size: png.byteLength,
    });
    const storageKey = (await prisma.message.findUniqueOrThrow({ where: { id: sent.id } })).attachmentKey;

    await service.removeCustomConversation(custom.id);

    expect(await prisma.conversation.findUnique({ where: { id: custom.id } })).toBeNull();
    expect(await prisma.fileObject.findUnique({ where: { storageKey: storageKey as string } })).toBeNull();
  });

  it('refuses to delete a general or per-entity conversation', async () => {
    const a = await makeResponsible('Entity P');
    const general = await prisma.conversation.findUniqueOrThrow({ where: { isGeneralSingleton: true } });
    await expect(service.removeCustomConversation(general.id)).rejects.toThrow('Tsy hita ny Hafatra.');
    await expect(service.removeCustomConversation(a.conversation.id)).rejects.toThrow('Tsy hita ny Hafatra.');
  });
});
