import { createHash, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { FILE_STORAGE, type FileStorage, VIRUS_SCANNER, type VirusScanner } from '../archives/file-storage.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { Permission } from '../authorization/permissions.js';
import { PrismaService } from '../database/prisma.service.js';
import { ATTACHMENT_TYPES, MAX_ATTACHMENT_SIZE } from './attachment-types.js';

const GENERAL_TITLE = 'Fifandraisana ankapobeny';

type ConversationRecord = {
  id: string;
  kind: 'GENERAL' | 'ENTITY';
  title: string;
  entityId: string | null;
  isActive: boolean;
};

type UploadedAttachment = { buffer: Buffer; originalname: string; size: number };

@Injectable()
export class ConversationsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
    @Inject(VIRUS_SCANNER) private readonly scanner: VirusScanner,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureDefaults().catch(() => undefined);
  }

  async ensureDefaults(): Promise<void> {
    await this.prisma.conversation.upsert({
      where: { isGeneralSingleton: true },
      create: { kind: 'GENERAL', title: GENERAL_TITLE, isGeneralSingleton: true },
      update: {},
    });
    const entities = await this.prisma.entity.findMany({ where: { isActive: true }, select: { id: true, name: true } });
    for (const entity of entities) {
      await this.prisma.conversation.upsert({
        where: { entityId: entity.id },
        create: { kind: 'ENTITY', title: entity.name, entityId: entity.id },
        update: {},
      });
    }
  }

  async listForUser(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { isActive: true },
      orderBy: [{ kind: 'asc' }, { title: 'asc' }],
    });
    const visible: ConversationRecord[] = [];
    for (const conversation of conversations) {
      if (await this.canRead(userId, conversation)) visible.push(conversation);
    }
    return visible.map((conversation) => ({
      id: conversation.id,
      kind: conversation.kind,
      title: conversation.title,
      entityId: conversation.entityId,
    }));
  }

  async getMessages(conversationId: string, userId: string, cursor?: string, limit = 30) {
    const conversation = await this.requireConversation(conversationId);
    if (!(await this.canRead(userId, conversation))) throw new ForbiddenException('Cette action n’est pas autorisée.');
    const take = Math.min(Math.max(limit, 1), 100);
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { sender: { select: { id: true, accountName: true } } },
    });
    const hasMore = messages.length > take;
    const page = messages.slice(0, take).reverse();
    return {
      messages: page.map((message) => ({
        id: message.id,
        body: message.body,
        createdAt: message.createdAt,
        sender: message.sender,
        attachment: message.attachmentKey
          ? { name: message.attachmentName, contentType: message.attachmentType, size: message.attachmentSize }
          : null,
      })),
      nextCursor: hasMore ? messages[take - 1]?.id : null,
    };
  }

  async sendMessage(conversationId: string, userId: string, body: string | undefined, file?: UploadedAttachment) {
    const conversation = await this.requireConversation(conversationId);
    if (!(await this.canWrite(userId, conversation))) throw new ForbiddenException('Cette action n’est pas autorisée.');
    const text = body?.trim();
    if (!text && !file) throw new BadRequestException('Tsy maintsy misy soratra na rakitra ampidirina.');

    let attachment: { storageKey: string; name: string; type: string; size: number } | null = null;
    if (file) attachment = await this.storeAttachment(file);

    try {
      const message = await this.prisma.message.create({
        data: {
          conversationId,
          senderId: userId,
          body: text ?? null,
          attachmentKey: attachment?.storageKey ?? null,
          attachmentName: attachment?.name ?? null,
          attachmentType: attachment?.type ?? null,
          attachmentSize: attachment?.size ?? null,
        },
        include: { sender: { select: { id: true, accountName: true } } },
      });
      return {
        id: message.id,
        body: message.body,
        createdAt: message.createdAt,
        sender: message.sender,
        attachment: attachment ? { name: attachment.name, contentType: attachment.type, size: attachment.size } : null,
      };
    } catch (error) {
      if (attachment) await this.storage.delete(attachment.storageKey).catch(() => undefined);
      throw error;
    }
  }

  async getAttachment(conversationId: string, messageId: string, userId: string) {
    const conversation = await this.requireConversation(conversationId);
    if (!(await this.canRead(userId, conversation))) throw new ForbiddenException('Cette action n’est pas autorisée.');
    const message = await this.prisma.message.findFirst({ where: { id: messageId, conversationId } });
    if (!message?.attachmentKey) throw new NotFoundException('Tsy hita ny rakitra.');
    const file = await this.storage.get(message.attachmentKey);
    if (
      !file ||
      file.size !== message.attachmentSize ||
      createHash('sha256').update(file.data).digest('hex') !== file.sha256
    )
      throw new ServiceUnavailableException('Tsy azo vakina na tsy mifanaraka ny rakitra voatahiry.');
    return {
      data: file.data,
      contentType: message.attachmentType ?? 'application/octet-stream',
      name: message.attachmentName ?? 'rakitra',
    };
  }

  listForAdministration() {
    return this.prisma.conversation.findMany({ orderBy: [{ kind: 'asc' }, { title: 'asc' }] });
  }

  async createEntityConversation(title: string, entityId: string) {
    const entity = await this.prisma.entity.findUnique({ where: { id: entityId } });
    if (!entity) throw new NotFoundException('Tsy hita ny vondrona.');
    const existing = await this.prisma.conversation.findUnique({ where: { entityId } });
    if (existing) throw new ConflictException('Efa manana resaka ity vondrona ity.');
    return this.prisma.conversation.create({ data: { kind: 'ENTITY', title: title.trim(), entityId } });
  }

  async setActive(id: string, isActive: boolean) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id } });
    if (!conversation) throw new NotFoundException('Tsy hita ny resaka.');
    return this.prisma.conversation.update({ where: { id }, data: { isActive } });
  }

  private async requireConversation(id: string): Promise<ConversationRecord> {
    const conversation = await this.prisma.conversation.findUnique({ where: { id } });
    if (!conversation || !conversation.isActive) throw new NotFoundException('Tsy hita ny resaka.');
    return conversation;
  }

  private canRead(userId: string, conversation: ConversationRecord): Promise<boolean> {
    return conversation.kind === 'GENERAL'
      ? this.authorization.hasPermission(userId, Permission.GENERAL_CONVERSATION)
      : this.authorization.hasPermission(userId, Permission.ENTITY_CONVERSATION_READ, {
          entityId: conversation.entityId ?? undefined,
        });
  }

  private canWrite(userId: string, conversation: ConversationRecord): Promise<boolean> {
    return conversation.kind === 'GENERAL'
      ? this.authorization.hasPermission(userId, Permission.GENERAL_CONVERSATION)
      : this.authorization.hasPermission(userId, Permission.ENTITY_CONVERSATION_WRITE, {
          entityId: conversation.entityId ?? undefined,
        });
  }

  private async storeAttachment(file: UploadedAttachment) {
    if (!file.buffer?.byteLength || !file.originalname)
      throw new BadRequestException('Tsy mety ny rakitra ampidirina.');
    if (file.buffer.byteLength > MAX_ATTACHMENT_SIZE)
      throw new BadRequestException('Ny rakitra dia tsy tokony hihoatra ny 5 Mo.');
    const originalName = file.originalname
      .replaceAll('\\', '/')
      .split('/')
      .at(-1)
      ?.replace(/[\u0000-\u001f\u007f]/g, '')
      .trim();
    if (!originalName || originalName.length > 180) throw new BadRequestException('Tsy mety ny anaran’ny rakitra.');
    const extension = originalName.slice(originalName.lastIndexOf('.')).toLowerCase();
    const type = ATTACHMENT_TYPES[extension as keyof typeof ATTACHMENT_TYPES];
    if (!type || !type.signature(file.buffer)) throw new BadRequestException('Tsy ekena io karazana rakitra io.');

    await this.scanner.scan(file.buffer);
    const storageKey = randomUUID();
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    await this.storage.put(storageKey, { data: file.buffer, size: file.buffer.byteLength, sha256 });
    return { storageKey, name: originalName, type: type.mime, size: file.buffer.byteLength };
  }
}
