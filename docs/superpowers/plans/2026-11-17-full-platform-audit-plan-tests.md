# Audit complet, plan par lots et cahier de tests FIVONDRONANA

> **Plan d’implémentation :** chaque lot doit être livré et vérifié indépendamment. Les cases sont à cocher au fur et à mesure de l’exécution.

**Objectif :** remplacer les écrans et comportements simulés par une application mobile, une API et un backoffice connectés à des données persistées et protégés par des règles d’accès vérifiables.

**Architecture recommandée :** conserver le monorepo Bun et les trois composants séparables : Expo/React Native pour le mobile, NestJS pour l’API métier, et un nouveau client web React/TypeScript pour l’administration. NestJS reste l’autorité pour les droits; PostgreSQL/Prisma reste la source des données métier. Ajouter les domaines en migrations progressives et migrer les clients par fonctionnalité, sans bascule big-bang.

**Socle actuel :** Bun workspaces, TypeScript strict, Expo SDK 58 / React Native 0.88 / React 19.3, NestJS 12, Prisma 7, PostgreSQL 17, tests unitaires `bun:test`.

**Documents de référence :** `docs/Application mobile FIVONDRONANA.md`, `docs/screens/`, `apps/mobile/PRODUCT.md`, `apps/mobile/DESIGN.md`.

**Documents d’exécution détaillés :** [conception technique et TDD des tâches restantes](../specs/2026-11-17-fivondronana-remaining-work-tdd.md) et [cahier de tests complet](../test-plans/2026-11-17-fivondronana-test-book.md). Ce document conserve l’audit initial et son inventaire de mocks.

## État audité au 17 novembre 2026

Le dépôt contient `apps/mobile` et `apps/api`. Il n’existe pas de `apps/backoffice`, ni de routes ou de module d’administration opérationnel. `AdministrationModule`, `UsersModule`, `ArchivesModule`, `ContactsModule` et `ConversationsModule` sont des modules NestJS vides. Le backoffice doit donc être traité comme une application à construire, pas comme un écran déjà existant.

L’API expose effectivement `GET /api/health`, les routes d’authentification (`POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`, `POST /api/auth/password`) et le CRUD du CV courant (`GET /api/cvs/me`, `PUT /api/cvs/me`). L’authentification persiste des sessions et vérifie les comptes actifs. Le CV courant est persisté avec ses branches et activités dans une transaction Prisma. Les autres fonctionnalités métier ne disposent ni de modèles persistés, ni de routes.

### Inventaire des données simulées ou fonctionnalités provisoires

| Emplacement | Données/comportement | État réel et remplacement attendu |
|---|---|---|
| `apps/mobile/src/main/sample-data.ts` | Trois archives, quatre responsables nommés A à D, deux contacts avec courriels `example.org`, trois notifications | Fixtures de démonstration importées directement par `MainShell`; créer des tables/services API et retirer ces imports des écrans de production. Garder des fixtures isolées dans les tests. |
| `apps/mobile/src/main/MainShell.tsx` | Bandeau `Angona santionany`, listes filtrées localement, notifications locales, écran messages vide, CV détaillé avec tirets | Les écrans n’interrogent aucune route pour archives, liste responsables, CV d’un autre responsable, contacts, notifications ou conversations. |
| `apps/mobile/src/main/MainShell.tsx` | `requestDownload` affiche uniquement un message; filtres et recherche sont limités aux données en mémoire | Aucun fichier d’archive/CV n’est récupéré; la recherche globale et les téléchargements sont à implémenter. |
| `apps/mobile/src/access/AccessScreens.tsx` | Récupération de mot de passe affiche qu’elle n’est pas disponible; case « Tsarovy aho » n’est qu’un état local | Définir un parcours de récupération et persister la session/préférence, ou retirer le contrôle non fonctionnel jusqu’à l’implémentation. |
| `apps/mobile/src/main/MainShell.tsx` | La suppression d’une notification retire seulement un élément de l’état local | Créer un état serveur lu/non lu/masqué et une règle d’annulation ou de confirmation cohérente. |
| `apps/api/scripts/seed-demo.ts` | Compte `demo@fivondronana.test` et mot de passe fixe | Données explicitement réservées au développement et gardées hors production; conserver le garde-fou et ne jamais réutiliser ce compte en préproduction/production. |
| `apps/api/tests/auth.test.ts` | Fausses implémentations Prisma | Doubles de test, pas des données de l’application; compléter par tests HTTP avec une vraie base de test. |
| `apps/mobile/tests/*` | Scénarios sur reducers et validateurs | Tests utiles mais sans rendu des écrans, sans réseau et sans parcours appareil. |

### Persistance actuelle

Prisma ne connaît que `User`, `AuthSession`, `Cv`, `CvBranch` et `CvActivity`. Il n’existe pas encore de modèles pour les rôles/administrateurs, groupes, entités, responsabilités, contacts, archives/fichiers, conversations, adhésions aux conversations, messages, pièces jointes ni notifications. Les deux migrations versionnées couvrent l’authentification et les CV personnels.

### Écarts de documentation et de qualité visibles

- `README.md` décrit encore une API de santé seule et des modèles métier absents; c’est maintenant périmé depuis l’ajout de l’authentification et du CV.
- `apps/mobile/PRODUCT.md` décrit le shell mobile comme placeholder, et l’API comme limitée à `/health`, alors que les écrans et deux domaines API ont évolué.
- Aucun dossier backoffice, workflow CI, commande lint/format, documentation OpenAPI, test E2E ou suite d’intégration DB n’est présent dans le dépôt.
- Les requêtes NestJS emploient des corps inline et une validation manuelle. Une validation commune avec DTO/schéma concret, transformation, whitelist et rejet des propriétés inconnues manque.
- Le token est gardé uniquement dans l’état React en mémoire; il disparaît au redémarrage. Le contrôle « se souvenir de moi » n’est pas relié à une persistance. Prévoir un stockage sécurisé Expo, jamais une valeur secrète en `EXPO_PUBLIC_*`.
- L’API n’expose aucune gestion des rôles/permissions. L’authentification actuelle ne suffit donc pas à autoriser les opérations d’administration ou à filtrer les données par entité.
- Les écrans d’accès et CV personnels ont des labels accessibles, mais l’ordre de focus, les erreurs annoncées, les zones sûres, la taille dynamique du texte, les modes sombre/clair et les tailles de petits appareils ne sont pas couverts par les tests présents.

## Décisions métier qui conditionnent le schéma et les permissions

À traiter dans le lot 0, avec une décision écrite dans les spécifications avant d’implémenter les lots qui en dépendent :

1. Le document dit à la fois qu’un responsable n’appartient qu’à un seul groupe/une seule entité et qu’un responsable peut appartenir à plusieurs entités pour accéder à plusieurs conversations. Définir cardinalités et exception éventuelle.
2. Définir les rôles d’administration, leurs permissions, et si l’administrateur peut aussi être responsable.
3. Définir qui peut lire/exporter un CV individuel ou l’archive complète de CV, y compris les responsables d’une autre entité.
4. Définir les responsabilités officielles, leur catalogue initial, et qui peut les créer/retirer.
5. Définir la récupération de mot de passe (admin, lien courriel ou OTP/SMS), le contrôle « se souvenir de moi », la durée de session et la révocation lors de désactivation.
6. Définir les formats MIME, limites de taille, stockage, rétention et téléchargement des archives et pièces jointes.
7. Définir si les notifications sont système ou dérivées des conversations, leur état de lecture et leur suppression.
8. Définir les champs personnels éditables par le responsable, au-delà du CV, et le comportement de suppression/désactivation d’un compte.
9. Choisir la cible du backoffice. Recommandation : portail web interne responsive React + TypeScript, dans `apps/backoffice`, consommant la même API NestJS avec des routes et permissions administrateur; ne pas mettre de règles métier dans l’interface.

## Principes techniques à appliquer à tous les lots

### TypeScript et organisation

- Garder `strict: true`; éviter `any`, assertions de type qui masquent une entrée non validée et modèles/API dupliqués. Partager les contrats neutres entre clients si cela ne couple pas les vues à Prisma/Nest.
- Distinguer DTO HTTP, modèles de domaine et réponses client; typer les états chargement/erreur/vide/succès.
- Garder les composants mobiles centrés sur l’affichage; extraire clients API, hooks/services, validation et composants réutilisables quand un domaine les justifie.
- Ajouter lint, format, règles d’import, contrôle de types et vérifications de dépendances exécutables localement et en CI.

### React Native et Expo

- Utiliser les API/modules compatibles avec le SDK Expo installé; ajouter les paquets natifs avec `expo install`, verrouiller Bun, et vérifier `expo-doctor` à chaque mise à niveau.
- Respecter zones sûres, clavier, orientation supportée, Dynamic Type, labels/états de contrôles, retour Android, états pressed/loading/disabled et réseau lent/hors ligne.
- Garder les clés privées et secrets côté serveur. L’URL publique de l’API n’est pas un secret. Stocker le jeton de session avec un module de stockage sécurisé et gérer expiration/révocation.
- Utiliser les listes virtualisées si les listes deviennent longues; pagination côté serveur et UI; ne pas télécharger toutes les archives ou tous les CV en mémoire.

### NestJS, API et base de données

- Garder contrôleurs minces; règles dans des services de domaine; DTO/schémas concrets avec validation globale, conversion contrôlée, whitelist et rejet des propriétés inconnues.
- Protéger chaque route privée côté serveur par authentification ET permission/filtre de périmètre; ne jamais se fier au filtrage mobile.
- Uniformiser erreurs HTTP, pagination, recherche, tri, journalisation, configuration par environnement, CORS selon les clients, limites de requête et documentation OpenAPI.
- Versionner les changements Prisma avec migrations relues et rétrocompatibles; utiliser des transactions pour les opérations multi-écritures; utiliser une base dédiée et jetable pour les tests d’intégration.
- Ajouter contrôle de débit à la connexion/récupération, journalisation d’audit des actions admin sensibles, validation de fichiers par taille/type/contenu, stockage non public et téléchargement autorisé.

## Plan d’implémentation par lots

### Lot 0 — Décisions, contrats et socle de qualité

**But :** lever les ambiguïtés métier et mettre l’équipe en mesure de faire évoluer les trois clients de façon vérifiable.

- [ ] Résoudre par écrit les neuf décisions ci-dessus; mettre à jour `docs/Application mobile FIVONDRONANA.md` et `apps/mobile/PRODUCT.md`.
- [ ] Valider le choix web React/TypeScript proposé et préciser l’authentification admin, le déploiement et le stockage des fichiers dans l’ADR.
- [x] Mettre à jour `README.md`, les commandes locales, les variables `.env.example` non secrètes et documenter le garde-fou du seed demo.
- [x] Ajouter lint/format et scripts cohérents aux workspaces existants; CI exécute installation verrouillée → format → lint → typecheck → unit → build. Le backoffice n’existe pas encore et n’a donc pas de scripts.
- [x] Ajouter un test Prisma/PostgreSQL isolé avec données aléatoires et nettoyage; CI fournit PostgreSQL jetable et migrations.
- [ ] Ajouter des tests HTTP NestJS sur PostgreSQL isolé; ils ne sont pas encore couverts par le test Prisma ci-dessus.
- [x] Activer la validation Nest globale, DTO stricts et contrat OpenAPI initial.
- [x] Uniformiser le format d’erreurs, conventions de pagination et versionnage OpenAPI.
- [ ] Définir la matrice rôles × opérations × périmètres qui deviendra la source des tests d’autorisation.

**Sortie :** documentation alignée, pipeline vert, contrat d’API et décisions signées, test DB isolé exécutable en CI.

### Lot 1 — Authentification, sécurité de session et backoffice initial

**But :** rendre la création et la gestion de comptes possible uniquement aux administrateurs autorisés.

- [ ] Étendre le modèle utilisateur aux coordonnées, profil, groupe/entité et statut selon les décisions; ajouter rôles et responsabilités avec relations contraintes.
- [ ] Créer routes admin : liste/recherche/pagination, détail, création, édition, affectation, désactivation/réactivation; aucune inscription publique.
- [ ] Ajouter contrôle d’accès de rôle/périmètre et journal d’audit de création, édition, affectation et désactivation.
- [ ] Créer `apps/backoffice` : connexion admin, garde de routes, liste/recherche des utilisateurs, formulaire création/édition, affectations et état inactif.
- [ ] Persister la session mobile de manière sécurisée, vérifier `/auth/me` au démarrage et traiter expiration, déconnexion et compte désactivé.
- [ ] Décider puis implémenter la récupération de mot de passe; retirer ou relier la case « se souvenir de moi » à la durée/session décidée.
- [ ] Ajouter rate limiting/auth logs sans journaliser mots de passe, jetons ou CV.

**Sortie :** un admin peut créer un compte de responsable; ce compte peut s’authentifier depuis mobile; l’admin peut le désactiver et révoquer ses sessions.

### Lot 2 — Référentiels et annuaire des responsables

**But :** remplacer la liste de responsables simulée par un annuaire autorisé et à jour.

- [ ] Implémenter modèles/routes de lecture des groupes, entités et responsabilités, avec les contraintes métier décidées.
- [ ] Ajouter `GET /api/leaders` avec pagination, recherche et filtres validés côté serveur; définir quelles propriétés publiques sont retournées.
- [ ] Relier la liste et les filtres mobile à l’API; gérer chargement, erreur, vide, rafraîchissement et pagination.
- [ ] Ajouter photos/profils avec stockage, limites et solution d’absence d’image; ne pas conserver les identifiants A/B/C/D en production.
- [ ] Cacher/retirer le bandeau demo en build non-demo et injecter fixtures uniquement dans les tests.

**Sortie :** les filtres entité/groupe et la recherche restituent des comptes persistés; l’API refuse les périmètres non autorisés.

### Lot 3 — CV : lecture autorisée, édition, PDF

**But :** finaliser le CV déjà commencé, préserver les droits propriétaire/lecteur et fournir les exports métier.

- [ ] Ajouter validation stricte DTO du CV et de ses sections répétées, validation d’email/téléphone/dates et limites de taille/longueur.
- [ ] Ajouter liste/détail des CV avec contrôle de visibilité et route d’export individuel; filtrer au serveur selon la matrice validée.
- [ ] Relier le détail CV mobile aux données; supprimer les tirets simulés; afficher erreurs, états incomplets et dates localisées.
- [ ] Compléter le formulaire CV: ajout/modification/suppression de lignes, erreurs proches des champs, protection contre perte de changements non enregistrés.
- [ ] Générer les PDF côté client ou serveur après décision sur les modèles Tily/Mpanazava; assurer échappement HTML, données longues et métadonnées.
- [ ] Implémenter export groupé uniquement pour les rôles autorisés, en streaming/job si volume important.

**Sortie :** un responsable modifie uniquement son CV; les lecteurs autorisés consultent/exportent le CV actuel; PDF individuel et groupé suivent les permissions.

### Lot 4 — Archives et documents

**But :** publier, lire et télécharger les originaux gérés par l’administration.

- [ ] Créer les modèles archive, catégorie, année, propriétaire, statut/version et référence de fichier; décider du stockage objet/local par environnement.
- [ ] Ajouter routes admin d’ajout, métadonnées, remplacement/version, publication, suppression/archivage et lecture autorisée côté mobile.
- [ ] Valider extensions ET MIME réel, taille, nom de fichier, antivirus/scan si disponible; empêcher traversal et liens publics permanents.
- [ ] Ajouter lecteur PDF et Word selon support produit; proposer ouverture externe contrôlée si l’aperçu Word natif n’est pas réaliste.
- [ ] Relier la liste, recherche/catégories/année, aperçu et téléchargement mobile à l’API; préserver l’original sans transformation.

**Sortie :** un archiveur autorisé publie un document PDF/DOCX; un responsable autorisé lit/télécharge la version originale; accès refusé après retrait.

### Lot 5 — Contacts et répertoire

**But :** gérer des contacts internes et partenaires depuis le backoffice et les rendre consultables dans le mobile.

- [ ] Créer modèle contact avec type interne/externe, coordonnées, description courte/détaillée, statut de publication et champs obligatoires décidés.
- [ ] Ajouter CRUD admin protégé, validation et historique de modification utile.
- [ ] Ajouter route mobile listant les contacts actifs, recherche/pagination et détail au clic.
- [ ] Remplacer les deux contacts de démonstration; vérifier liens téléphone/courriel et confidentialité des champs masqués.

**Sortie :** ajout/modification/retrait admin se reflète à la prochaine lecture mobile; les détails s’ouvrent et se ferment sans exposer les brouillons.

### Lot 6 — Conversations, membres et autorisations

**But :** bâtir le modèle et la sécurité avant l’interface de chat.

- [ ] Créer conversations générale/privée, portée entité ou autre critère décidé, membres, statut et index d’historique.
- [ ] Ajouter CRUD admin des conversations et membres; empêcher les états incohérents selon les cardinalités validées.
- [ ] Ajouter routes lecture/historique et création de message texte avec vérification de membership au serveur à chaque accès.
- [ ] Révoquer immédiatement l’accès quand un utilisateur est retiré ou désactivé; établir les règles de conservation et audit.
- [ ] Choisir transport temps réel (WebSocket/SSE/polling) en fonction des besoins; préserver fallback réseau et pagination historique.

**Sortie :** tests prouvant l’isolation inter-entité et l’accès général; la révocation bloque le prochain fetch et toute connexion temps réel.

### Lot 7 — Messagerie mobile et pièces jointes

**But :** livrer un parcours de conversation réellement utilisable sur réseau mobile.

- [ ] Ajouter liste des salons autorisés, historique paginé, envoi texte, états envoi/échec/retry et temps réel.
- [ ] Ajouter images/vidéos/fichiers uniquement après définition formats/tailles; upload signé/autorisé, analyse et téléchargement par membres uniquement.
- [ ] Ajouter états absence de réseau/reconnexion, messages non lus et notification selon décisions; gérer doublons et ordre des messages.
- [ ] Remplacer l’écran « aucun échange » de façade; aucune conversation non autorisée ne doit être exposée par cache ou recherche.

**Sortie :** deux comptes autorisés voient un nouveau message; un compte hors salon ne peut ni le lire, ni l’obtenir par ID, recherche ou URL de fichier.

### Lot 8 — Recherche, notifications et paramètres complets

**But :** remplacer les derniers états locaux provisoires et terminer les parcours d’accès/compte.

- [ ] Définir et implémenter recherche globale avec permissions et résultats paginés; ne pas chercher des ressources non autorisées.
- [ ] Persister notifications, date/état lu, compteur et masquage si exigé; offrir retour arrière si la suppression est destructive.
- [ ] Implémenter édition uniquement des champs personnels autorisés; groupe, entité et responsabilités officielles restent administrateur-gérés.
- [ ] Finaliser récupération, contrôles d’erreurs, changement de mot de passe, sécurité jeton, fermeture session sur désactivation et réauthentification sensible.
- [ ] Retirer données/fonctions de demo des builds de distribution et documenter le mode démo explicitement séparé.

**Sortie :** aucun bouton visible n’est une action muette/factice; les préférences et états survivent au redémarrage quand leur règle le prévoit.

### Lot 9 — Durcissement, accessibilité et publication

**But :** valider les comportements réels avant diffusion.

- [ ] Tests automatisés complets unitaires/intégration/E2E dans CI et migration sur base vide depuis l’historique versionné.
- [ ] Revue sécurité des autorisations, tokens, uploads, rate limits, secrets, journaux, sauvegardes et export PII.
- [ ] Revue mobile iOS/Android : zones sûres, clavier, petites/grandes tailles, landscape si supporté, contraste, lecteur d’écran, cibles tactiles et réseau dégradé.
- [ ] Revue backoffice : navigation clavier, accessibilité formulaire/table, confirmation suppression, session admin et tailles desktop/tablette.
- [ ] Build de préproduction depuis environnement propre, migrations, smoke tests, procédure de rollback et instructions d’exploitation/backup.

**Sortie :** checklist de release signée, aucune donnée de démo en production, sauvegarde/restauration testée, critères P0/P1 clos.

## Ordre et dépendances

`Lot 0 → Lot 1 → Lot 2 → Lot 3/4/5 (parallélisables après leurs contrats) → Lot 6 → Lot 7 → Lot 8 → Lot 9`.

Le lot 3 peut démarrer tôt pour terminer le CV personnel, mais la lecture du CV d’un autre responsable dépend des règles de visibilité. Les lots 4 et 5 sont indépendants après le backoffice initial. Le lot 7 ne commence pas avant la sécurité de membership du lot 6. Aucun lot ne contourne le lot 0 pour les cardinalités contradictoires.

## Cahier de tests

### Règles d’exécution communes

- Les tests automatisés utilisent une base PostgreSQL dédiée, jetable et réinitialisée par migrations; ne jamais lancer de nettoyage sur la base du développeur ou de production.
- Fixtures synthétiques et factories : 1 admin actif, 1 admin non autorisé, 3 responsables répartis sur 2 entités, 1 compte désactivé, CV complets/incomplets, archive publiée/brouillon, contact interne/externe, salon général et privés.
- Jetons et mots de passe sont uniques aux tests. Vérifier qu’aucun secret ou contenu privé ne se retrouve dans les logs.
- Les tests contractuels valident statut HTTP, schéma JSON, erreurs, pagination et non-régression OpenAPI. Les tests E2E utilisent des services démarrés et des comptes dédiés.
- Tests appareil réels ou simulateurs iOS et Android pour clavier, safe areas, partage/téléchargement de fichiers, reprise réseau et accessibilité; Expo Go seul ne remplace pas un build de préproduction.

### A. Socle, base, configuration et build

| ID | Scénario | Résultat attendu |
|---|---|---|
| SYS-01 | Installer depuis un checkout propre avec le lockfile | Installation reproductible sans modification involontaire du lockfile. |
| SYS-02 | Lancer lint, format check, typecheck et tests unitaires de chaque workspace | Tous passent; aucune erreur ignorée ou test dépendant de l’ordre. |
| SYS-03 | Construire API, mobile et backoffice depuis CI | Build reproductible; aucune variable locale requise silencieusement. |
| SYS-04 | Appliquer toutes les migrations sur PostgreSQL vide | Schéma complet créé; contraintes/index/FK présents; aucune étape manuelle non documentée. |
| SYS-05 | Appliquer les migrations déjà présentes une seconde fois | Résultat idempotent/no-op selon Prisma; aucune perte ou duplication. |
| SYS-06 | Variable requise absente/mal formée (DB, JWT, API endpoint) | Échec de démarrage explicite, sans fuite de secret ni stack incompréhensible pour l’utilisateur final. |
| SYS-07 | Seed demo exécuté avec environnement production | Refus ferme; aucune ligne demo insérée. |
| SYS-08 | Migrations et startup face à DB indisponible | Échec contrôlé, logs utiles, processus non déclaré healthy à tort. |

### B. Authentification, sessions et compte

| ID | Scénario | Résultat attendu |
|---|---|---|
| AUTH-01 | Connexion avec email valide et mot de passe correct | 200; session/token émis; utilisateur public sans hash ni secrets. |
| AUTH-02 | Connexion avec téléphone valide normalisé | 200 pour identifiant équivalent; normalisation cohérente et documentée. |
| AUTH-03 | Email/téléphone inconnu, mauvais mot de passe, compte désactivé | Même message/statut non révélateur; aucun jeton/sessions. |
| AUTH-04 | Identifiant vide, trop long, invalide; mot de passe vide ou surdimensionné | 400; aucune requête métier effectuée. |
| AUTH-05 | Requête protégée sans Bearer, schéma erroné, token altéré, token expiré | 401; aucune donnée privée renvoyée. |
| AUTH-06 | Session révoquée par logout | L’ancien token ne passe plus le guard dès la requête suivante. |
| AUTH-07 | Désactivation d’un compte admin pendant session active | Toutes les sessions de ce compte sont révoquées; accès refusé ensuite. |
| AUTH-08 | Changement mot de passe avec ancien mot de passe erroné | 401/erreur contractuelle; hash, sessions et mot de passe restent inchangés. |
| AUTH-09 | Mot de passe trop court / conforme aux règles retenues | Invalide rejeté; valide hashé avec sel; sessions existantes révoquées selon règle. |
| AUTH-10 | Redémarrage application, choix « se souvenir » activé/désactivé | Restauration sécurisée uniquement selon la durée choisie; bouton correspond au comportement effectif. |
| AUTH-11 | Sortie de compte mobile, online et offline | Jeton effacé localement; l’API révoque la session si online; écran d’accès affiché. |
| AUTH-12 | Récupération mot de passe pour compte existant/inexistant | Réponse non énumérante; canal/jeton à usage unique expirant fonctionne; abus limité. |
| AUTH-13 | Brute force répétée sur login et recovery | Limitation de débit appliquée par IP/identifiant sans bloquer arbitrairement les autres utilisateurs. |
| AUTH-14 | Android/iOS : fermeture forcée et ouverture après expiration | Pas de flash de contenu privé avant validation de session; retour vers login propre. |

### C. Administration et backoffice

| ID | Scénario | Résultat attendu |
|---|---|---|
| ADM-01 | Login admin valide puis ouverture backoffice | Route protégée; identité/rôle visible; session survit selon politique. |
| ADM-02 | Responsable tente d’ouvrir UI ou API admin directement | UI redirige/refuse et API retourne 403; masquer un bouton seul ne compte pas comme protection. |
| ADM-03 | Créer responsable avec valeurs valides | Compte actif unique créé; mot de passe hashé; confirmation non stockée; événement audité. |
| ADM-04 | Email déjà utilisé / téléphone déjà utilisé / aucun identifiant joignable | Validation précise; contrainte DB protège aussi les courses concurrentes. |
| ADM-05 | Champs requis absents, type invalide, champ non reconnu | 400; pas de mutation partielle; aucune propriété injectée dans le modèle. |
| ADM-06 | Modifier données éditables et affectations | Données visibles au prochain fetch mobile; opération atomique et auditée. |
| ADM-07 | Assigner plusieurs responsabilités valides / identiques / non existantes | Affectations valides distinctes; invalides rejetées. |
| ADM-08 | Affecter entité/groupe en contradiction avec la règle décidée | Refus serveur; invariant aussi assuré en base si possible. |
| ADM-09 | Désactiver puis réactiver un utilisateur | Connexion et accès révoqués pendant désactivation; retour contrôlé après réactivation. |
| ADM-10 | Supprimer un compte référencé par CV/messages/audit | Politique d’archivage/anonymisation appliquée; pas de suppression accidentelle des données à conserver. |
| ADM-11 | Recherche par compte, entité, responsabilité; pagination et tri | Correspondances exactes, résultats stables sans doublons ni fuite entre pages. |
| ADM-12 | Double clic, timeout puis retry sur création | Une seule ressource créée ou idempotence documentée. |
| ADM-13 | Utilisateur admin ouvre URL copiée sans session ou session expirée | Redirection login; aucune donnée rendue dans HTML/cache. |
| ADM-14 | Clavier seul, lecteur d’écran, zoom 200% sur table/formulaire | Focus visible/logique, labels annoncés, erreurs associées, actions réalisables sans souris. |

### D. Responsables, entités, groupes et filtres mobile

| ID | Scénario | Résultat attendu |
|---|---|---|
| LEAD-01 | Charger annuaire authentifié avec données persistées | Noms, photo/fallback, responsabilités, entité et groupe reflètent DB. |
| LEAD-02 | Recherche par nom, responsabilité, entité, accents/casse | Résultats attendus; trim/casse/accents définis; aucun ancien mock résiduel. |
| LEAD-03 | Filtrer Mavo/Maitso/Mena/Menafify et Tily/Mpanazava | Filtrage combiné exact; boutons gardent leurs dimensions et états annoncés. |
| LEAD-04 | « Rehetra » pour entité et groupe | Filtre correspondant effacé sans effacer l’autre filtre ou la recherche. |
| LEAD-05 | Recherche sans résultat, serveur vide, panne réseau | États vide/erreur distincts; action retry; aucune fausse donnée. |
| LEAD-06 | Changement d’entité utilisateur ou droits retirés | Annuaire et détails s’actualisent selon la nouvelle portée; cache privé nettoyé. |
| LEAD-07 | Pagination avec changement de filtre/recherche | Page repart à 1; aucune ligne du filtre précédent ne subsiste. |
| LEAD-08 | Très grand nombre de responsables et noms longs | Pagination/virtualisation; UI fluide, texte non superposé et sans overflow horizontal non voulu. |

### E. CV propriétaire, lecture, export

| ID | Scénario | Résultat attendu |
|---|---|---|
| CV-01 | GET CV inexistant de l’utilisateur connecté | État formulaire vierge, sans erreur ni CV d’un autre utilisateur. |
| CV-02 | Enregistrer CV complet et le relire après redémarrage | Toutes les propriétés et lignes répétées persistent sans décalage de date/UTC. |
| CV-03 | Champ requis absent, espaces uniquement, date invalide/future si interdite | Erreurs près du champ; serveur rejette même si validation client contournée. |
| CV-04 | Email, téléphone, texte Unicode/Malagasy, accents et limites de longueur | Valeurs valides acceptées et conservées; valeurs excessives rejetées avec message utile. |
| CV-05 | Ajouter/éditer/supprimer 0, 1 et plusieurs lignes branches/activités | Ajouts/mises à jour/suppressions persistés; identifiants stables; pas de duplication à retry. |
| CV-06 | Ligne branche sans nom/groupe lorsque requis | Toute la transaction échoue, ancien CV intact. |
| CV-07 | Charger ou modifier `/cvs/:id` d’un autre utilisateur non autorisé | 403/404 selon politique; aucune donnée écrite ou révélée. |
| CV-08 | Utilisateur non connecté appelle routes CV | 401. |
| CV-09 | Deux sauvegardes concurrentes du même CV | Pas de perte silencieuse non définie; stratégie de version/dernier-write convenue. |
| CV-10 | Quitter l’éditeur avec modifications non enregistrées | Avertissement; confirmer abandon réinitialise, annuler conserve les changements. |
| CV-11 | Export PDF individuel avec champs courts/longs, accents et section vide | PDF lisible, encodage juste, aucun HTML injecté, modèle Tily/Mpanazava choisi correctement. |
| CV-12 | Export de CV interdit par rôle/portée | API refuse avant génération; aucun fichier temporaire public. |
| CV-13 | Export groupé autorisé, gros volume | Tous les CV attendus une fois; export terminé/téléchargeable; mémoire/temps bornés; audit si sensible. |
| CV-14 | Annuler partage PDF ou échec stockage/share | L’application reste stable et donne un retour exact; pas de faux « réussi ». |

### F. Archives, fichier et stockage

| ID | Scénario | Résultat attendu |
|---|---|---|
| ARC-01 | Admin publie PDF valide avec titre/catégorie/année | Métadonnées et fichier cohérents; apparaît dans le mobile après chargement. |
| ARC-02 | Télécharger fichier PDF publié | Octets identiques à l’original, MIME/nom corrects et accès autorisé. |
| ARC-03 | Charger `.exe` renommé `.pdf`, mauvais MIME, DOCX corrompu, fichier trop lourd | Refus serveur; objet temporaire supprimé; message clair. |
| ARC-04 | Publier sans titre/fichier, catégorie inconnue ou métadonnées mal formées | 400; aucune ressource orpheline. |
| ARC-05 | Brouillon, archive retirée ou utilisateur sans accès | Non listé et téléchargement interdit même avec URL devinée. |
| ARC-06 | Remplacer document/version ou supprimer archive | Politique de version/rétention appliquée; pas de suppression irréversible non confirmée. |
| ARC-07 | Lecture PDF/Word mobile, retour arrière, manque d’espace, offline | Viewer/fallback explicite; aucun crash; fichier partiel non présenté comme complet. |
| ARC-08 | Nom avec `../`, caractères spéciaux, très long ou Unicode | Nom normalisé; aucune traversal; affichage/téléchargement correct. |
| ARC-09 | Recherche catégorie/année et liste paginée vide | Résultat exact; état vide et retry disponibles. |
| ARC-10 | Injection HTML/script dans titre ou nom du fichier | Texte échappé; pas d’exécution dans backoffice, mobile ou PDF. |

### G. Contacts

| ID | Scénario | Résultat attendu |
|---|---|---|
| CON-01 | Admin crée contact interne/externe valide | Contact actif créé et visible au mobile autorisé. |
| CON-02 | Champ obligatoire manquant, email invalide, téléphone mal formé | Validation au client et API; aucune donnée invalide persistée. |
| CON-03 | Modification et publication | Détails mis à jour après refresh; brouillon reste invisible. |
| CON-04 | Suppression/archivage d’un contact consulté | Contact retiré selon politique; anciennes données n’apparaissent plus du cache. |
| CON-05 | Détails repliés puis « voir plus » | Détails masqués par défaut, bouton accessible expose l’état expanded/collapsed. |
| CON-06 | Téléphone/email activables | Dialer/mail client s’ouvre avec la valeur correcte; pas d’action sur chaîne malformée. |
| CON-07 | Recherche avec accents/casse et aucun résultat | Filtrage cohérent; état vide lisible. |

### H. Conversations et messagerie

| ID | Scénario | Résultat attendu |
|---|---|---|
| MSG-01 | Admin crée conversation générale | Visible seulement aux comptes autorisés selon la règle commune. |
| MSG-02 | Admin crée conversation privée liée à entité | Membres dérivés/assignés selon décision; statut et périmètre validés. |
| MSG-03 | Membre demande liste/historique autorisé | Messages paginés avec auteur, conversation et date persistés dans l’ordre établi. |
| MSG-04 | Responsable d’une autre entité lit salon, message ou pièce jointe par ID | Refus serveur; même absence de données dans recherche, cache et socket. |
| MSG-05 | Envoyer texte valide, vide, espaces, très long, Unicode | Valide persisté une fois; vide/excessif rejeté avec limites contractuelles. |
| MSG-06 | Envoyer doublon à cause d’un retry réseau | Idempotence ou doublon explicitement prévenu. |
| MSG-07 | Retirer un membre/compte désactivé pendant session/socket active | Le prochain événement et fetch sont bloqués; ancien historique inaccessible selon règle. |
| MSG-08 | Pièce jointe image/vidéo/document valide et invalide | Formats/taille contrôlés côté serveur; scan/statut; accès limité aux membres. |
| MSG-09 | Réseau coupé pendant envoi puis reconnexion | État pending/failed/retry clair; pas de perte ni doublon silencieux. |
| MSG-10 | Nouveau message, historique très long, deux appareils | Mise à jour temps réel/poll; pagination stable et ordre cohérent multi-appareils. |
| MSG-11 | Conversation désactivée/archivée | Aucun nouveau message; consultation selon politique de conservation. |
| MSG-12 | WebSocket non autorisé ou token révoqué | Connexion refusée/fermée; aucun événement de salon reçu. |

### I. Notifications, recherche et paramètres

| ID | Scénario | Résultat attendu |
|---|---|---|
| APP-01 | Recherche globale par chaque domaine | Résultats utiles et uniquement dans le périmètre de l’utilisateur. |
| APP-02 | Recherche vide, accents, fautes mineures si supportées, pagination | Comportement documenté; aucune liste de tout le système par défaut. |
| APP-03 | Notification nouvelle/lue/masquée sur deux appareils | État serveur cohérent; compteur correctement recalculé. |
| APP-04 | Action de suppression notification puis annulation | Annulation restaure l’élément; sinon confirmation avant suppression définitive. |
| APP-05 | Modifier champ personnel autorisé | Modification persistée et visible après reconnexion. |
| APP-06 | Modifier soi-même entité/responsabilité officielle | Refus API, même si client manipulé. |
| APP-07 | Changer mot de passe dans Settings et revenir login | Ancien mot de passe refusé, nouveau accepté; session ancienne révoquée. |
| APP-08 | Quitter session après changement réussi | Confirmation UX cohérente et pas de délai fragile sans traitement de fermeture. |

### J. Qualité mobile, accessibilité, performance et exploitation

| ID | Scénario | Résultat attendu |
|---|---|---|
| MOB-01 | iPhone avec encoche et Android avec caméra/barre gestuelle | Aucun titre, champ, bouton fixe ou tab bar sous les zones système. |
| MOB-02 | Petits appareils 320/360/375 dp et paysage si autorisé | Pas de contenu coupé ni contrôle inaccessible; scroll attendu. |
| MOB-03 | Clavier ouvert sur login, recherche, paramètres et CV | Champ actif visible, clavier adapté, retour/validation corrects, pas de chevauchement. |
| MOB-04 | Plus grande taille de texte/Dynamic Type et zoom système | Contenu reflow; actions et labels restent visibles/opérables. |
| MOB-05 | TalkBack/VoiceOver | Chaque contrôle a un nom et un état; ordre logique; erreurs et succès annoncés une fois. |
| MOB-06 | Contraste clair/sombre et états selected/disabled/error | Texte et états discernables; aucun état communiqué uniquement par couleur. |
| MOB-07 | Rotation, retour Android, retour iOS, liens profonds si ajoutés | Retour conserve contexte sans révéler écran privé ou revenir à état incohérent. |
| MOB-08 | 3G lent, timeout, serveur 500, offline, retour réseau | Chargement/retry/erreur adaptés; pas de faux résultat réussi; pas de blocage permanent. |
| MOB-09 | Pas de réseau pendant téléchargement/upload | Reprise/annulation propre; pas de fichier corrompu déclaré valide. |
| MOB-10 | App background/foreground et session expirée | Données protégées; token revérifié; flux de reconnexion explicite. |
| MOB-11 | Taper très vite filtres/boutons et navigation répétée | Aucun double envoi ou décalage layout; état final égal à la dernière action. |
| MOB-12 | Profil avec contenu très long/Unicode | Texte s’adapte; pas de chevauchement ou perte silencieuse. |
| OPS-01 | Déploiement staging avec secrets différents du local | Aucun secret intégré au bundle mobile ou aux logs; URL endpoint par environnement. |
| OPS-02 | Sauvegarder puis restaurer DB/fichiers en environnement de test | Données relationnelles et documents cohérents restaurés dans le RTO/RPO décidés. |
| OPS-03 | Erreur 4xx/5xx corrélée à un identifiant de requête | Logs exploitables sans mot de passe, bearer token, contenu de message ou CV en clair. |
| OPS-04 | Migration échoue en staging | Déploiement interrompu proprement; sauvegarde/rollback ou plan correctif documenté. |
| OPS-05 | Alertes santé API/DB/stockage et saturation | Service dégradé détecté; seuils/action d’exploitation définis. |

## Critères globaux d’acceptation

1. Aucun tableau `sample-data` n’est consommé dans un build de distribution; mode de démonstration explicitement séparé et désactivable.
2. Chaque action visible aboutit à un succès serveur vérifiable ou annonce honnêtement son indisponibilité; aucun succès simulé.
3. Tous les accès à CV, archives, conversations, contacts et administration sont autorisés côté API selon une matrice testée.
4. Les parcours principaux définis passent sur iOS et Android et dans le navigateur backoffice; les principaux scénarios P0 ne dépendent pas d’un seed local.
5. CI verte : format, lint, TypeScript, unit tests, intégration DB/API, E2E critiques et builds.
6. Aucun P0/P1 sécurité, perte de données ou blocage de parcours n’est ouvert à la release.
7. Documents d’installation, variables d’environnement, migrations, récupération compte, rôles, stockage et procédure de sauvegarde décrivent l’état livré.

## Références techniques officielles consultées

- [Validation NestJS](https://docs.nestjs.com/techniques/validation) — validation des entrées HTTP avec DTO/schémas et pipe global.
- [Tests NestJS](https://docs.nestjs.com/fundamentals/testing) — tests unitaires et de l’application Nest.
- [Autorisation NestJS](https://docs.nestjs.com/security/authorization) — permissions serveur.
- [Variables d’environnement Expo](https://docs.expo.dev/guides/environment-variables/) — `EXPO_PUBLIC_*` est visible dans le code client; aucun secret client.
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) — stockage local chiffré de petites valeurs sensibles.
- [React Native Accessibility](https://reactnative.dev/docs/accessibility) — rôles, labels, états et annonces accessibles.
- [React Native SafeAreaView](https://reactnative.dev/docs/safeareaview) — composant déprécié; utiliser `react-native-safe-area-context` pour gérer les zones sûres et tester sur appareils réels.
- [Prisma tests d’intégration v7](https://www.prisma.io/docs/orm/v7/prisma-client/testing/integration-testing) — base de test réelle et migrations reproductibles.
- [Prisma transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) — opérations métier atomiques multi-écritures.

