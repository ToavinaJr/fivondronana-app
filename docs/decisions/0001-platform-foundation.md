# ADR 0001: Socle de la plateforme FIVONDRONANA

- **Statut :** proposition en cours de validation
- **Date :** 17 novembre 2026
- **Portée :** règles métier structurantes et choix techniques du lot 0
- **Sources :** `docs/Application mobile FIVONDRONANA.md`, audit complet du projet

## Contexte

Le dépôt contient un client Expo/React Native, une API NestJS et une base PostgreSQL/Prisma. Le backoffice est requis par les règles métier, mais aucun client ni système de rôles d'administration n'existe encore. Certaines règles de cardinalité et d'accès se contredisent; elles ne doivent pas être transformées silencieusement en contraintes de base ou en autorisations.

## Décisions proposées

| Sujet | Décision proposée ou règle existante | État |
|---|---|---|
| Affectation groupe/entité | Le texte interdit deux groupes/deux entités, mais la messagerie décrit aussi plusieurs appartenances. Choisir une cardinalité avant le schéma. | **En attente du propriétaire produit** |
| Acteurs et rôles | Les règles distinguent Administrateur, Responsable, Responsable d'entité et Responsable général. L'API devra appliquer les rôles et périmètres côté serveur. Le cumul Admin + Responsable reste à confirmer. | **Partiel** |
| Lecture et export CV | Les responsables consultent les CV autorisés; l'export individuel et l'export global sont demandés. Le périmètre exact (tous les responsables ou même entité) n'est pas précisé. | **En attente du propriétaire produit** |
| Responsabilités officielles | Création, attribution et retrait relèvent de l'administrateur; suppression permise seulement si aucune affectation n'existe. Les responsabilités citées dans le texte sont des exemples, pas un catalogue exhaustif confirmé. | **Règle confirmée; catalogue à confirmer** |
| Mot de passe et session | Le changement vérifie l'ancien mot de passe. La récupération, « Tsarovy aho » et la durée voulue ne sont pas définis. L'API actuelle émet un jeton de 15 minutes; cette durée est un choix technique provisoire, pas une règle produit. La désactivation devra empêcher toute authentification et révoquer les sessions. | **Partiel** |
| Fichiers | Les archives acceptées sont PDF et Word; les messages supportent images, vidéos et fichiers. Taille, MIME réel, stockage, rétention et détails de téléchargement ne sont pas définis. Stockage privé et autorisation serveur proposés. | **Partiel** |
| Notifications | Le document métier n'établit ni état lu/non lu, ni suppression, ni règles d'origine. Ne pas créer d'engagement produit avant décision. | **En attente du propriétaire produit** |
| Données personnelles éditables | L'utilisateur peut modifier les informations personnelles autorisées, mais la liste n'est pas définie. Entité et responsabilités restent administrées. Politique de suppression/rétention non précisée. | **Partiel** |
| Backoffice | Créer un portail web interne responsive dans `apps/backoffice`, en React + TypeScript, qui consomme l'API NestJS. Les règles et contrôles d'accès restent dans l'API. L'authentification admin, son transport navigateur et l'hébergement restent à décider avant le lot 1. | **Direction proposée** |

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
