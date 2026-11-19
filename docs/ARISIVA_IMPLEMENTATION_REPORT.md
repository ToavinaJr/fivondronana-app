# Arisiva — implémentation ADR

Date : 19 novembre 2026

## Décisions appliquées

- Stockage binaire PostgreSQL `FileObject`, isolé derrière le port `FileStorage`; métadonnées dans `Archive`.
- PDF, DOC et DOCX jusqu'à 5 Mio. La validation vérifie extension et signature; DOCX exige aussi `[Content_Types].xml` et `word/document.xml` dans son répertoire ZIP.
- ClamAV 1.5.4 via TCP `INSTREAM`; l'API échoue fermée si le scanner échoue ou ne répond pas `OK`. L'image reste sur le réseau privé Compose et le port hôte est publié sur loopback.
- Upload en brouillon après scan propre; rescannage avant publication.
- Les responsables lisent uniquement les archives publiées. Chaque téléchargement exige une session active et l'autorisation; réponse `private, no-store`, taille et checksum vérifiés. Aucun lien public ou temporaire n'est émis; une révocation bloque la prochaine requête.
- Les administrateurs peuvent téléverser, publier/dépublier et supprimer. Métadonnées et binaire sont supprimés dans une transaction PostgreSQL.

## Vérification observée

- `bun run build:api`, `bun run typecheck` et `bun run format:check` : réussis.
- `bun run test:integration` : 88 réussis, 0 échec; migrations PostgreSQL jetables, cycle stockage/publish/download/delete, accès aux brouillons admin, détection de corruption par checksum, HTTP API et ClamAV réel vérifiés. Le test antivirus utilise la chaîne EICAR inoffensive pour confirmer le rejet.
- Projet Compose temporaire unique nettoyé après les tests; aucune base de développement/production utilisée.

## Limites restantes

- L'interface admin de gestion et le branchement liste/téléchargement de l'app mobile ne sont pas inclus; les endpoints API sont disponibles.
- PostgreSQL est l'adaptateur réel de développement. Le fournisseur et la stratégie de stockage en production restent un choix de déploiement.
- Aucune qualification globale de production, sauvegarde/restauration, ni test natif mobile n'est revendiquée.
