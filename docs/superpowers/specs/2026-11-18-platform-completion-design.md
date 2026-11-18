# FIVONDRONANA Platform Completion Design

## Intent

Faire évoluer le prototype actuel vers une plateforme mobile et web fiable pour les responsables et administrateurs FIVONDRONANA, avec API réelle, persistance, autorisation serveur, états UX complets et livraison progressive.

## Confirmed product rules

- Chaque responsable appartient à un seul groupe et une seule entité.
- Un administrateur peut également être responsable; les deux rôles peuvent coexister sur un compte.
- Tous les responsables peuvent consulter les CV des responsables et conserver le téléchargement PDF individuel et global prévu au cahier des charges. Chaque responsable ne peut modifier que son propre CV.
- Le catalogue initial des responsabilités est : Haim-panahy, Fampitaovana, Mpitantsoratra, Mpitahiry vola. Seul un administrateur peut créer ou retirer une responsabilité; une responsabilité affectée doit être retirée des comptes avant suppression.
- Le portail web React/TypeScript est validé. L'administrateur s'authentifie avec les mêmes identifiants que les responsables; l'API applique les droits selon les rôles du compte.
- Pour chaque nouveau lien temporaire de fichier, l'API revalide les droits. Un lien déjà émis reste valide au plus pendant sa courte expiration; la valeur de 5 minutes est la proposition de conception.
- Aucune donnée réelle ni version mobile distribuée ne doit être préservée par une exigence de compatibilité. Les migrations restent versionnées et relues.

## Goals

- Conserver le monolithe modulaire NestJS/PostgreSQL et les clients Expo et React/TypeScript.
- Finaliser l'authentification, la session mobile sécurisée et la révocation des sessions à la désactivation d'un compte.
- Construire une autorisation serveur basée sur l'utilisateur, ses rôles, son groupe et son unique entité.
- Remplacer progressivement les fixtures mobiles par des domaines API réels.
- Livrer chaque domaine avec validation, erreurs, loading/skeleton, empty/retry states, tests et documentation.
- Préparer migrations, observabilité, sauvegardes et livraison sans déclarer le prototype prêt avant validation réelle.

## Non-goals

- Introduire des microservices.
- Ajouter du temps réel ou des notifications push avant validation du besoin et des limites opérationnelles.
- Choisir silencieusement les fournisseurs email/SMS, l'hébergement, le stockage fichiers ou les SLO.
- Utiliser les captures d'écran comme assets de production.

## Constraints and open decisions

- Stack conservée : Bun workspaces, Expo SDK 58/React Native 0.88, NestJS 12, Prisma 7 et PostgreSQL 17.
- Interface mobile Malagasy-first et compatibilité iOS/Android.
- Le backend est l'autorité pour les permissions et l'accès aux CV, documents, contacts et conversations.
- L'unicité de groupe et d'entité est un invariant serveur et base de données.
- La récupération de mot de passe offrira le choix email ou SMS, mais fournisseurs et vérification du canal restent à sélectionner.
- Le comportement exact de « Tsarovy aho » et la durée totale d'une session restent à fixer; le jeton d'accès de 15 minutes actuellement codé est provisoire.
- Le stockage, les formats/tailles upload, l'antivirus, l'hébergement du backoffice et les objectifs SLO/RPO/RTO restent à décider avant déploiement concerné.
- Le retrait d'une responsabilité affectée nécessite d'abord son retrait/réaffectation des comptes.

## Current baseline

- L'API expose health, login, session courante, logout, changement de mot de passe et lecture/sauvegarde du CV personnel.
- Le schéma Prisma contient `User`, `AuthSession`, `Cv`, `CvBranch` et `CvActivity`.
- Le mobile possède les écrans d'accès, le shell principal et l'éditeur de CV.
- L'annuaire, les archives, contacts, notifications et conversations utilisent encore des fixtures ou des placeholders.
- Les modules API correspondants sont présents mais ne fournissent pas encore de fonctionnalités métier.
- Les contrôles statiques, typecheck et tests unitaires passent; les tests PostgreSQL sont encore ignorés lorsque la base de test n'est pas disponible.

## Approaches considered

### Foundation-first

Terminer toute la sécurité, l'autorisation et la livraison avant les fonctionnalités visibles. Cette approche réduit le risque de rework, mais retarde les parcours utilisateurs.

### Mobile-first

Connecter les écrans existants au fur et à mesure de la création des endpoints. Cette approche donne rapidement une impression de progression, mais propage les contrats avant le modèle d'accès.

### Vertical slices — chosen

Construire d'abord le socle d'autorisation minimal, puis livrer chaque domaine de bout en bout : modèle, API, permissions, mobile, états UX, tests et documentation. Cette approche produit des incréments testables sans propager les fixtures.

## Proposed architecture

Le backend reste un monolithe modulaire. Les modules métier partagent `PrismaModule` et utilisent un service d'autorisation centralisé.

```text
User ──< UserRole >── Role
 │
 └── 0..1 EntityMembership ── Entity ── Group
 │
 └── owns ── Cv (lecture par tous les responsables; édition par le propriétaire)

User ── participates in ── ConversationMembership ── Conversation
Entity ── scopes ── private Conversation
```

Le modèle autorise un compte à porter simultanément les rôles administrateur et responsable, tout en garantissant au plus une appartenance courante à un groupe et une entité. Les règles d'accès sont évaluées côté serveur; aucun `entityId`, rôle ou droit fourni par le client n'est considéré fiable.

Le téléchargement de fichiers est autorisé au moment de l'émission d'un lien signé/temporaire. Une révocation empêche toute nouvelle émission; le lien existant expire au plus après cinq minutes. Le mobile stocke les secrets de session dans SecureStore, restaure la session à l'ouverture et traite globalement les réponses 401.

## Delivery slices

1. **Stabilisation et sécurité de base** : session mobile sécurisée, readiness DB, throttling, hardening HTTP, seed fail-closed, migrations et intégration reproductible.
2. **Identité et autorisation** : groupes, entités, responsabilités, rattachement unique, rôles cumulables et permissions minimales.
3. **Annuaire et CV** : recherche/pagination; lecture et export PDF individuel/global pour les responsables; édition uniquement par le propriétaire.
4. **Archives** : métadonnées, catégories, liens temporaires, stockage sécurisé et contrôle d'autorisation.
5. **Contacts** : liste/détail, confidentialité par défaut, recherche et actions natives validées.
6. **Conversations** : membres, messages, permissions liées au groupe/à l'entité, historique et isolation.
7. **Administration et backoffice** : comptes, affectations, responsabilités et gestion des contenus selon les décisions validées.
8. **Recherche, notifications et finalisation UX** : comportements définis, suppression des mocks et contrôles des actions visibles.
9. **Production readiness** : observabilité, backups/restauration, CI/CD, scans, builds mobiles et runbooks.

Chaque tranche doit être livrable indépendamment et ne peut être marquée terminée que si API, client, états UX, tests et documentation sont cohérents.

## Decisions left to the builder

- Utiliser `EntityMembership` unique par responsable avec un unique groupe et une unique entité associés; appliquer les invariants par contraintes DB et service.
- Utiliser des rôles cumulables, mais n'activer que les opérations explicitement décrites dans le cahier des charges.
- Démarrer le catalogue des responsabilités avec les quatre valeurs listées ci-dessus; interdire la suppression tant qu'une affectation existe.
- Proposer une expiration de lien temporaire de 5 minutes; confirmer l'implémentation technique selon le fournisseur de stockage.
- Préférer des endpoints paginés et des DTO explicites aux modèles Prisma retournés directement.
- Utiliser un job de migration séparé du runtime API pour les environnements de déploiement.

## Acceptance criteria for the program

- Aucun écran de production ne dépend de `sample-data.ts`.
- Toute lecture, modification, suppression ou export protégé passe par une vérification serveur.
- Un responsable ne peut avoir plusieurs groupes ou entités; tous les responsables voient les CV et téléchargent les PDF prévus; seuls les propriétaires modifient leur CV.
- Un administrateur peut aussi utiliser les fonctions responsables, et les opérations admin restent restreintes au rôle administrateur.
- Les tests d'intégration PostgreSQL et les parcours critiques sont reproductibles.
- La production n'utilise ni seed de démonstration, ni secrets codés, ni documentation contradictoire.
