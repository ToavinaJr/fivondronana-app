import { BadRequestException, Body, Controller, Get, Module, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard, type AuthenticatedRequest } from '../auth/access-token.guard.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { PrismaService } from '../database/prisma.service.js';
import { CvAccessController } from './cv-access.controller.js';
import { CvAccessService } from './cv-access.service.js';
import { CvInputDto } from './dto/cv-input.dto.js';

@Controller('cvs/me')
@ApiTags('curriculum vitae')
@UseGuards(AccessTokenGuard)
class MyCvController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getMine(@Req() request: AuthenticatedRequest) {
    return this.prisma.cv.findUnique({
      where: { userId: request.auth.user.id },
      include: { branches: true, activities: true },
    });
  }

  @Put()
  @ApiBody({ type: CvInputDto })
  async saveMine(@Req() request: AuthenticatedRequest, @Body() body: CvInputDto) {
    const birthDate = new Date(body.birthDate);
    const branches = normalizeRows(
      body.branches,
      ['name', 'group'],
      ['name', 'group', 'project', 'startedAt', 'endedAt'],
    );
    const activities = normalizeRows(body.activities, [], ['name', 'responsibility', 'description', 'date']);
    const extraFields = (value: unknown) => {
      if (value === undefined) return [];
      if (!Array.isArray(value)) throw new BadRequestException('Les informations supplémentaires sont invalides.');
      return value.flatMap((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item))
          throw new BadRequestException('Les informations supplémentaires sont invalides.');
        const { label, value: fieldValue } = item as Record<string, unknown>;
        if (typeof label !== 'string' || typeof fieldValue !== 'string')
          throw new BadRequestException('Les informations supplémentaires sont invalides.');
        const trimmedLabel = label.trim();
        const trimmedValue = fieldValue.trim();
        return trimmedLabel && trimmedValue ? [{ label: trimmedLabel, value: trimmedValue }] : [];
      });
    };
    const data = {
      firstName: (body.firstName as string).trim(),
      lastName: (body.lastName as string).trim(),
      address: (body.address as string).trim(),
      birthDate,
      birthPlace: optionalString(body.birthPlace),
      phone: (body.phone as string).trim(),
      email: (body.email as string).trim(),
      facebook: optionalString(body.facebook),
      province: (body.province as string).trim(),
      area: (body.area as string).trim(),
      fivondronana: (body.fivondronana as string).trim(),
      extraPersonal: extraFields(body.extraPersonal),
      extraContact: extraFields(body.extraContact),
    };
    const userId = request.auth.user.id;
    return this.prisma.$transaction(async (tx) => {
      const cv = await tx.cv.upsert({ where: { userId }, create: { ...data, userId }, update: data });
      await tx.cvBranch.deleteMany({ where: { cvId: cv.id } });
      await tx.cvActivity.deleteMany({ where: { cvId: cv.id } });
      if (branches.length)
        await tx.cvBranch.createMany({
          data: branches.map((row) => ({ ...row, cvId: cv.id })) as {
            cvId: string;
            name: string;
            group: string;
            project: string | null;
            startedAt: Date | null;
            endedAt: Date | null;
          }[],
        });
      if (activities.length)
        await tx.cvActivity.createMany({
          data: activities.map((row) => ({ ...row, cvId: cv.id })) as {
            cvId: string;
            name: string | null;
            responsibility: string | null;
            description: string | null;
            date: Date | null;
          }[],
        });
      return tx.cv.findUnique({ where: { id: cv.id }, include: { branches: true, activities: true } });
    });
  }
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new BadRequestException('Une valeur texte est attendue.');
  return value.trim() || null;
}

function normalizeRows(value: unknown, required: string[], fields: string[]): Array<Record<string, unknown>> {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new BadRequestException('Le format des sections répétables est invalide.');
  return value.map((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row))
      throw new BadRequestException('Une section répétable est invalide.');
    const input = row as Record<string, unknown>;
    for (const field of required)
      if (typeof input[field] !== 'string' || !input[field].trim())
        throw new BadRequestException(`Le champ ${field} est obligatoire dans une section.`);
    const output: Record<string, unknown> = {};
    for (const field of fields) {
      const entry = input[field];
      if (entry === undefined || entry === null || entry === '') {
        if (field === 'startedAt' || field === 'endedAt' || field === 'date') output[field] = null;
        continue;
      }
      if (field === 'startedAt' || field === 'endedAt' || field === 'date') {
        const parsed = new Date(entry as string);
        if (typeof entry !== 'string' || Number.isNaN(parsed.getTime()))
          throw new BadRequestException(`La date ${field} est invalide.`);
        output[field] = parsed;
      } else {
        if (typeof entry !== 'string') throw new BadRequestException(`Le champ ${field} doit être un texte.`);
        output[field] = entry.trim() || null;
      }
    }
    return output;
  });
}

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [MyCvController, CvAccessController],
  providers: [CvAccessService],
})
export class CvsModule {}
