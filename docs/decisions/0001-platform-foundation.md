# ADR 0001: Socle de la plateforme FIVONDRONANA

- **Statut :** décisions produit mises à jour le 18 novembre 2026; choix d'infrastructure encore partiels
- **Date :** 17 novembre 2026 (mise à jour : 18 novembre 2026)
- **Portée :** règles métier structurantes et choix techniques de la plateforme
- **Sources :** `docs/Application mobile FIVONDRONANA.md`, `apps/mobile/PRODUCT.md`, audit complet et réponses du propriétaire produit

## Contexte

Le dépôt contient un client Expo/React Native, une API NestJS et une base PostgreSQL/Prisma. Le backoffice est requis par les règles métier et sera un portail web React/TypeScript. Le backend reste l'autorité pour l'authentification, les autorisations et les données.

## Registre des décisions

| Sujet | Décision | État |
|---|---|---|
| Affectation groupe/entité | Un responsable appartient à un seul groupe et à une seule entité. Le modèle et l'API doivent empêcher les appartenances multiples. | **Confirmé** |
| Acteurs et rôles | Un administrateur peut aussi être responsable. Les deux rôles peuvent coexister sur un compte; l'accès à chaque opération reste contrôlé côté API. Les pouvoirs détaillés de « responsable d'entité » et « responsable général » suivent le cahier des charges. | **Confirmé; matrice détaillée à formaliser** |
| Lecture et export CV | Tous les responsables peuvent consulter les CV des responsables et les télécharger en PDF individuellement ou selon le parcours « tous les CV » du cahier des charges. Un responsable ne peut modifier que son propre CV. | **Confirmé** |
| Responsabilités officielles | Catalogue initial : Haim-panahy, Fampitaovana, Mpitantsoratra, Mpitahiry vola. Un administrateur peut créer et retirer une responsabilité; une responsabilité déjà affectée ne peut être retirée qu'après réaffectation des comptes concernés. | **Confirmé** |
| Récupération du mot de passe | Les responsables doivent pouvoir choisir l'email ou le SMS comme canal de récupération. Les fournisseurs d'envoi et la vérification du canal restent à définir avant l'activation. | **Canaux confirmés; infrastructure à choisir** |
| « Tsarovy aho » et durée de session | Le comportement de persistance et la durée totale de session n'ont pas encore été fixés. Le jeton d'accès actuel de 15 minutes reste une valeur technique provisoire; ne pas présenter la durée totale comme décidée. | **À préciser** |
| Désactivation de compte | Un compte désactivé ne peut plus se connecter; toute session existante doit être révoquée au moment de la désactivation. | **Confirmé** |
| Fichiers | Les archives originales PDF/Word sont conservées hors de PostgreSQL. Les pièces jointes de conversation suivent les types et limites du cahier des charges, avec validation serveur. Les limites exactes et l'analyse antivirus restent à définir avant upload. | **Partiel** |
| Téléchargements protégés | Chaque émission de lien temporaire revalide l'autorisation. Un lien déjà émis demeure valide jusqu'à sa courte expiration; valeur proposée : 5 minutes. Aucun nouveau lien n'est émis après révocation. | **Confirmé; expiration proposée à 5 min** |
| Notifications | Les sources, lecture/non-lu, masquage/suppression et périmètres suivent les parcours du cahier des charges; les sémantiques non décrites restent à décider avant implémentation. | **Partiel** |
| Données personnelles éditables | L'utilisateur peut modifier les informations permises par le cahier des charges, mais ne peut pas modifier son entité ni ses responsabilités officielles. Les champs exacts doivent être appliqués tels qu'énumérés par les exigences. | **Confirmé selon cahier des charges** |
| Backoffice | Portail web React/TypeScript validé. L'administrateur s'authentifie avec les mêmes identifiants de compte que les responsables; les autorisations admin restent distinctes. L'hébergement et le transport/session navigateur restent à choisir. | **Produit et identifiants confirmés; hébergement à choisir** |
| Compatibilité des migrations | Aucune donnée réelle ni version mobile distribuée n'est à préserver. Les migrations peuvent évoluer sans stratégie de compatibilité avec une ancienne production; elles restent versionnées, relues et non destructives envers les données locales à moins d'approbation distincte. | **Confirmé** |
| Volumes et objectifs de service | Les volumes, latence, disponibilité, RPO et RTO restent à définir avant les choix d'exploitation et de montée en charge. | **À préciser** |

## Contraintes techniques retenues

- TypeScript reste en mode strict dans les workspaces. Les données HTTP sont validées à la frontière; une validation client ne remplace jamais celle de l'API.
- Les écrans React Native/Expo consomment des services typés et couvrent chargement, erreur, état vide et succès. Utiliser les modules natifs compatibles avec le SDK Expo verrouillé.
- NestJS porte les règles métier, l'authentification et les permissions. Les contrôleurs restent minces; les opérations multi-écritures utilisent une transaction Prisma.
- PostgreSQL/Prisma reste la source de vérité. Chaque évolution de schéma est une migration versionnée; les tests d'intégration utilisent une base jetable distincte de la base locale.
- Les secrets restent côté serveur. Les valeurs `EXPO_PUBLIC_*` sont publiques et ne contiennent que de la configuration client telle que l'adresse de l'API.
- CI cible une installation reproductible depuis `bun.lock`, format/lint, contrôle TypeScript, tests unitaires, tests d'intégration isolés, puis build.

## Conséquences et séquencement

Les décisions confirmées peuvent être modélisées et testées. Les choix d'infrastructure encore ouverts (fournisseurs email/SMS, hébergement backoffice, stockage fichiers, limites upload, sessions complètes et objectifs SLO) bloquent uniquement les déploiements ou comportements qui en dépendent; les interfaces et tests indépendants peuvent avancer.

Le compte `demo@fivondronana.test` reste exclusivement une fixture locale de développement. Le seed refuse les environnements de production et les environnements non explicitement autorisés.
