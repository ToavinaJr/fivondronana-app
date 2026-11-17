# ADR 0001: Socle de la plateforme FIVONDRONANA

- **Statut :** proposition en cours de validation
- **Date :** 17 novembre 2026
- **Portée :** règles métier structurantes et choix techniques du lot 0
- **Sources :** `docs/Application mobile FIVONDRONANA.md`, audit complet du projet

## Contexte

Le dépôt contient un client Expo/React Native, une API NestJS et une base PostgreSQL/Prisma. Le backoffice est requis par les règles métier, mais aucun client ni système de rôles d'administration n'existe encore. Certaines règles de cardinalité et d'accès se contredisent; elles ne doivent pas être transformées silencieusement en contraintes de base ou en autorisations.

## Registre des décisions

Les statuts **En attente** et **Partiel** ne constituent pas une approbation. Les propositions décrivent des options à soumettre au propriétaire produit; les migrations, permissions ou expériences utilisateur qui en dépendent restent différées jusqu'à validation.

| Sujet | Décision à valider ou règle existante | État |
|---|---|---|
| Affectation groupe/entité | Le texte interdit deux groupes/deux entités, mais la messagerie décrit aussi plusieurs appartenances. Confirmer cardinalité et exceptions avant le schéma. | **En attente du propriétaire produit** |
| Acteurs et rôles | Les règles citent Administrateur, Responsable, Responsable d'entité et Responsable général. Confirmer la matrice rôle × opération × périmètre, le cumul Admin + Responsable et les permissions d'un responsable général. | **Partiel** |
| Lecture et export CV | L'édition de son propre CV est prévue. Confirmer qui peut consulter/exporter un CV individuel et tous les CV, notamment hors entité. | **En attente du propriétaire produit** |
| Responsabilités officielles | L'administration gère les responsabilités et peut supprimer une responsabilité inutilisée. Les noms cités ne forment pas un catalogue validé; confirmer le catalogue initial et qui peut le modifier. | **Règle confirmée; catalogue à confirmer** |
| Mot de passe et session | Le changement vérifie l'ancien mot de passe. Confirmer récupération, « Tsarovy aho », durée, persistance, rotation et révocation à la désactivation. Le jeton de 15 minutes est provisoire. | **Partiel** |
| Fichiers | PDF/Word sont cités pour les archives et images/vidéos/fichiers pour le chat. Confirmer types MIME, limites, stockage, rétention, analyse antivirus et partage externe. | **Partiel** |
| Notifications | Confirmer les sources, lecture/non-lu, masquage/suppression et périmètres; aucune sémantique n'est définie par le document métier. | **En attente du propriétaire produit** |
| Données personnelles éditables | Confirmer les champs modifiables hors CV et la suppression/anonymisation/rétention. Entité et responsabilités officielles sont administrées. | **Partiel** |
| Backoffice | Portail React/TypeScript dans `apps/backoffice` proposé. Confirmer le choix web, l'authentification navigateur, l'hébergement et la stratégie de stockage de fichiers. | **Direction proposée** |
| Révocation des téléchargements après retrait d’accès | Confirmer si un téléchargement déjà autorisé cesse immédiatement après révocation. Proposition technique : chaque lecture repasse par l'API et revérifie l'accès; une URL signée conserve un accès jusqu'à expiration. | **En attente du propriétaire produit** |
| Compatibilité des migrations avec les données et clients existants | Confirmer s'il existe des données réelles ou d'anciennes versions mobiles à préserver. Proposition : migrations additives et maintien des contrats `/auth/*` et `/cvs/me` pendant la transition. | **En attente du propriétaire produit** |
| Volumes cibles et objectifs de service | Définir utilisateurs, connexions simultanées, archives/pièces jointes, volume d'export, latence, disponibilité, RPO et RTO avant les choix de charge et de traitement asynchrone. | **En attente du propriétaire produit** |

## Contraintes techniques retenues

- TypeScript reste en mode strict dans les workspaces. Les données HTTP doivent être validées à la frontière; une validation du client ne remplace jamais celle de l'API.
- Les écrans React Native/Expo consomment des services typés et couvrent chargement, erreur, état vide et succès. Utiliser les modules natifs compatibles avec le SDK Expo verrouillé.
- NestJS porte les règles métier, l'authentification et les permissions. Les contrôleurs restent minces; les opérations multi-écritures utilisent une transaction Prisma.
- PostgreSQL/Prisma reste la source de vérité. Chaque évolution de schéma est une migration versionnée; les tests d'intégration utilisent une base jetable distincte de la base locale du développeur.
- Les secrets restent côté serveur. Les valeurs `EXPO_PUBLIC_*` sont publiques et ne contiennent que de la configuration client telle que l'adresse de l'API.
- CI cible: installation reproductible depuis `bun.lock`, format/lint, contrôle TypeScript, tests unitaires, tests d'intégration isolés, puis build.

## Conséquences et séquencement

Les décisions marquées « en attente » bloquent les contraintes relationnelles correspondantes, la matrice d'autorisation et les routes dépendantes. Les équipes peuvent préparer les contrôles de qualité, les contrats indépendants de ces choix et la coquille web du backoffice. L'ADR devra être mis à jour avec les décisions validées avant le lot qui les consomme.

Le compte `demo@fivondronana.test` est exclusivement une fixture locale de développement. Le script doit continuer à refuser `NODE_ENV=production` et `APP_ENV=production`; ne jamais utiliser ce compte dans un environnement partagé ou réel.
