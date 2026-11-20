import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const adrPath = resolve(import.meta.dir, '../../../docs/decisions/0001-platform-foundation.md');
const adr = readFileSync(adrPath, 'utf8');
const businessRules = readFileSync(
  resolve(import.meta.dir, '../../../docs/Application mobile FIVONDRONANA.md'),
  'utf8',
);
const prismaSchema = readFileSync(resolve(import.meta.dir, '../prisma/schema.prisma'), 'utf8');

describe('ADR decision contract', () => {
  it('tracks all decisions that block implementation with an explicit status', () => {
    const expectedDecisions = [
      'Affectation groupe/entité',
      'Acteurs et rôles',
      'Lecture et export CV',
      'Responsabilités officielles',
      'Récupération du mot de passe',
      '« Tsarovy aho » et durée de session',
      'Fichiers',
      'Notifications',
      'Données personnelles éditables',
      'Backoffice',
      'Téléchargements protégés',
      'Compatibilité des migrations',
      'Volumes et objectifs de service',
      'Transport temps réel et gestion des membres',
      'Infrastructure de test PostgreSQL',
      'Global search (périmètre)',
    ];

    for (const decision of expectedDecisions) {
      const row = adr.split('\n').find((line) => line.startsWith(`| ${decision} |`));
      expect(row, `ADR must state the decision and its status: ${decision}`).toBeDefined();
      expect(row).toMatch(
        /\| \*\*(En attente du propriétaire produit|Partiel|Règle confirmée[^|]*|Direction proposée|Confirmé[^|]*|À préciser|Canaux confirmés[^|]*|Produit et identifiants confirmés[^|]*)\*\* \|$/,
      );
    }
  });

  it('keeps pending choices visibly separate from confirmed technical constraints', () => {
    expect(adr).toContain('À préciser');
    expect(adr).toContain('restent à définir');
    expect(businessRules).toContain('aucune règle contradictoire ne doit être choisie implicitement');
    expect(prismaSchema).toMatch(/^model Archive /m);
    expect(prismaSchema).not.toMatch(/^model Notification /m);
  });
});
