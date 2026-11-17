import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'bun:test';

const adrPath = resolve(import.meta.dir, '../../../docs/decisions/0001-platform-foundation.md');
const adr = readFileSync(adrPath, 'utf8');
const businessRules = readFileSync(resolve(import.meta.dir, '../../../docs/Application mobile FIVONDRONANA.md'), 'utf8');
const prismaSchema = readFileSync(resolve(import.meta.dir, '../prisma/schema.prisma'), 'utf8');

describe('ADR decision contract', () => {
  it('tracks all decisions that block implementation with an explicit status', () => {
    const expectedDecisions = [
      'Affectation groupe/entité',
      'Acteurs et rôles',
      'Lecture et export CV',
      'Responsabilités officielles',
      'Mot de passe et session',
      'Fichiers',
      'Notifications',
      'Données personnelles éditables',
      'Backoffice',
      'Révocation des téléchargements après retrait d’accès',
      'Compatibilité des migrations avec les données et clients existants',
      'Volumes cibles et objectifs de service',
    ];

    for (const decision of expectedDecisions) {
      const row = adr.split('\n').find((line) => line.startsWith(`| ${decision} |`));
      expect(row, `ADR must state the decision and its status: ${decision}`).toBeDefined();
      expect(row).toMatch(/\| \*\*(En attente du propriétaire produit|Partiel|Règle confirmée[^|]*|Direction proposée)\*\* \|$/);
    }
  });

  it('keeps pending choices visibly separate from confirmed technical constraints', () => {
    expect(adr).toContain('En attente du propriétaire produit');
    expect(adr).toContain('ne doivent pas être transformées silencieusement');
    expect(businessRules).toContain('aucune règle contradictoire ne doit être choisie implicitement');
    expect(prismaSchema).not.toMatch(/^model (EntityMembership|Responsibility|Notification|Archive|Conversation|Message) /m);
    expect(prismaSchema).not.toMatch(/^enum (Role|UserRole) /m);
  });
});
