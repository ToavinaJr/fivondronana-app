# Audit final — état initial du 19 novembre 2026

Statut : audit en cours, plateforme **non qualifiée pour production**. Ce titre désigne le livrable demandé, pas une validation finale.

## Périmètre et preuves

Inventaire des deux workspaces, lecture README, PRODUCT, DESIGN, cahier métier, ADR, plans/spécifications et cahier de tests. Revue backend/mobile détaillée en cours. Les décisions confirmées de l’ADR et la mission du 19 novembre priment sur les états historiques contradictoires. Aucune réécriture ni changement métier engagé.

## Constats initiaux

| Sévérité | Constat | Preuve | Traitement |
|---|---|---|---|
| P0 | API Compose sans JWT_SECRET, NODE_ENV forcé development, CORS non transmis | [Compose](../infra/docker-compose.yml) | Lot 1 |
| P0 qualification | Tests PostgreSQL ignorés hors configuration dédiée ; commande intégration ne couvre que deux fichiers | [runner](../scripts/test-integration.ts), [package API](../apps/api/package.json) | Lots 1–2 |
| P1 | Sessions longues/rotation et récupération SendGrid absentes | Modules auth et écrans accès | Lot 3 |
| P1 | Gestion des comptes et portail web absents | Workspaces et routes API | Lot 4 |
| P1 | Archives et conversations : modules vides ; notifications absentes | Modules API, shell mobile | Lots 5–7 |
| P1 qualification | Lint global échoue : 3 erreurs et 3 avertissements mobile | `bun run lint`, 19 novembre | Lot 8 / gate qualité |
| P2 | README et anciens plans affirment encore que contacts/annuaire sont absents et certaines décisions ouvertes | Documentation historique | Mise à jour progressive |

## Fonctionnalités existantes à préserver

Connexion email/téléphone, session courte et logout, SecureStore, changement de mot de passe, CV personnel, annuaire paginé, consultation/export CV, contacts publiés, référentiels administrés et contrôles serveur. Leur présence ne prouve pas la validation native ou l’absence de défauts.

## Risques et dépendances

Ne pas exécuter de nettoyage sur la base de développement. Une instance PostgreSQL 17 séparée, sans volume partagé et nom de base terminé par `_test`, sera utilisée. Stabiliser migrations/tests avant sessions, comptes et fichiers. Ne pas activer de publication sans antivirus. Trancher session navigateur, appartenance aux conversations et événements de notification avant les comportements correspondants.

Les suites actuelles ne remplacent ni tests E2E natifs ni qualification des sauvegardes ni scans de sécurité. Aucun pourcentage de couverture mesuré à ce stade.
