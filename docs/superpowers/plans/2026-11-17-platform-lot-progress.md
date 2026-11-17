# SDD ledger â€” plan: docs/superpowers/specs/2026-11-17-fivondronana-remaining-work-tdd.md

## ExÃ©cution du 17 novembre 2026

### Ã‰tat de dÃ©part

- Checkout `master` propre avant les modifications; aucune modification antÃ©rieure nâ€™a Ã©tÃ© Ã©crasÃ©e.
- Lâ€™utilisateur a choisi de continuer dans le dossier actuel.
- Baseline `bun run test`: 20 tests passent et les 3 tests PostgreSQL sont ignorÃ©s faute de test DB dans lâ€™environnement du processus.
- Baseline `bun run typecheck`: API et mobile passent.

### Lot 0.2 â€” contrat dâ€™erreur, pagination, OpenAPI

- RED: `bun test tests/api-contract.test.ts` Ã©choue dâ€™abord car `api-errors.ts` nâ€™existe pas.
- GREEN: 13 tests du contrat API passent; le test HTTP vÃ©rifie que le document OpenAPI publie les schÃ©mas dâ€™erreur et de pagination.
- Modifications: format dâ€™erreur stable sans dÃ©tails internes en 5xx, extraction du chemin sans query string, pagination page/pageSize bornÃ©e (20 par dÃ©faut, maximum 100), plafond du numÃ©ro de page garantissant un offset sÃ»r, helper de conversion en `skip/take`, `OpenAPI 0.1.0`, configuration centrale appliquÃ©e dans le bootstrap Nest.
- VÃ©rifications Ã  la fin du lot: lint, format, typecheck et tests unitaires passent.

### Lot 0.3 â€” tests HTTP / PostgreSQL

- Tests Ã©crits: health, login, identitÃ© courante sans hash, validation avec enveloppe dâ€™erreur, lecture/Ã©criture CV, rÃ©vocation de session.
- `bun run test:integration` vÃ©rifie que `DATABASE_URL_TEST` est une URL PostgreSQL et que le nom de base se termine par `_test`; il remplace ensuite `DATABASE_URL` du processus enfant par la valeur de test.
- RÃ©sultat local: P1000 sur `localhost:5432`, base `fivondronana_test`, avant lâ€™application dâ€™une migration. Aucun changement DB nâ€™a Ã©tÃ© appliquÃ© par cette exÃ©cution.
- Statut: non terminÃ© tant que les tests HTTP/PostgreSQL ne passent pas avec les bons identifiants du bac Ã  sable de test.

### Lot 0.4 â€” pipeline qualitÃ©

- Le workflow `.github/workflows/quality.yml` prÃ©existant crÃ©e un service PostgreSQL nommÃ© `fivondronana_test`, applique les migrations et exÃ©cute format, lint, typecheck, tests et build API.
- Workflow distant non exÃ©cutÃ© ici; aucune rÃ©ussite CI nâ€™est revendiquÃ©e.

### Lot 3.1 â€” dates CV

- RED: deux nouveaux cas dÃ©montrent que `1990-02-30` et `2026-02-30` Ã©taient acceptÃ©s par la validation par dÃ©faut.
- GREEN: les dates de naissance, branches et activitÃ©s utilisent `IsDateString({ strict: true, strictSeparator: true })`; les deux cas passent.
- La transaction de persistance du CV reste Ã  vÃ©rifier dans le test PostgreSQL isolÃ©.

### Lot 3.2 â€” protection des modifications CV

- RED: `bun test tests/cv-dirty.test.ts` Ã©choue avant la crÃ©ation du helper de comparaison.
- GREEN: 3 tests couvrent lâ€™Ã©tat inchangÃ©, les modifications de champ/ligne imbriquÃ©e et lâ€™Ã©galitÃ© par valeur entre objets distincts.
- `CvEditor` compare le formulaire Ã  la derniÃ¨re version chargÃ©e ou enregistrÃ©e; le retour affiche une confirmation destructive si le formulaire a changÃ©. AprÃ¨s sauvegarde rÃ©ussie, la nouvelle rÃ©ponse API devient la rÃ©fÃ©rence propre.
- `bun run typecheck` passe; le test ciblÃ© mobile passe. La confirmation native reste Ã  valider sur appareil/simulateur.

### Validation globale aprÃ¨s lots 0.2, 0.3, 3.1 et 3.2

- `bun run format:check`: passe aprÃ¨s formatage du test API mobile.
- `bun run lint`: passe.
- `bun run typecheck`: passe.
- `bun run test`: API 27 tests passent, mobile 14 passent; 10 tests PostgreSQL sont ignorÃ©s car la base test nâ€™est pas accessible/configurÃ©e dans lâ€™environnement.
- `bun run test:integration`: toujours bloquÃ© par P1000 sur `fivondronana_test`; ne pas confondre avec une validation dâ€™intÃ©gration rÃ©ussie.

### Reprise du contrat pagination

- RED: le nouveau test ne pouvait pas sâ€™exÃ©cuter car `getPaginationOffset` nâ€™existait pas; le cas de numÃ©ro de page extrÃªme a Ã©tÃ© ajoutÃ© au mÃªme jeu de validation.
- GREEN: le DTO borne `page` pour que `(page - 1) * pageSize` reste dans `Number.MAX_SAFE_INTEGER`; `getPaginationOffset` retourne `{ skip, take }` pour Prisma.
- `bun test tests/api-contract.test.ts`: 15 tests passent, incluant rejet de la page dÃ©mesurÃ©e et offset correct pour page 3 / taille 25.
- AprÃ¨s ce complÃ©ment, `bun run test` passe avec 29 tests API et 14 tests mobile; 10 tests PostgreSQL restent ignorÃ©s. `bun run format:check`, `bun run lint` et `bun run typecheck` passent.

### Garde des helpers de pagination

- RED: le test de contrat montre que `createPaginatedResponse` accepte `total = -1` et renvoie `totalPages: -0`.
- GREEN: les helpers rejettent les totaux nÃ©gatifs/non sÃ»rs, les pages ou tailles hors bornes et les offsets non sÃ»rs; la validation HTTP et les appels internes partagent maintenant les mÃªmes limites.
- `bun test tests/api-contract.test.ts` depuis `apps/api`: 16 tests passent.
- `bun run format:check`, `bun run lint` et `bun run typecheck` passent. Une invocation depuis la racine avec un chemin relatif au workspace API a chargÃ© les mÃ©tadonnÃ©es Nest hors de lâ€™ordre attendu; le test ciblÃ© depuis `apps/api` passe correctement.

### Lot 3.1 â€” limites et caractÃ¨res malgaches du CV

- Ajout dâ€™un test de validation couvrant `firstName` Ã  100 caractÃ¨res puis Ã  101, les accents malgaches et les textes Unicode dans les champs et sections rÃ©pÃ©tÃ©es.
- Les limites dÃ©jÃ  dÃ©clarÃ©es dans le DTO acceptent la valeur Ã  la borne et rejettent le dÃ©passement; aucun changement de rÃ¨gles nâ€™a Ã©tÃ© nÃ©cessaire.
- `bun test tests/api-validation.test.ts`: 7 tests passent. `bun test` depuis `apps/api`: 31 passent, 10 PostgreSQL sont ignorÃ©s.
- `bun run format:check`, `bun run lint` et `bun run typecheck` passent aprÃ¨s formatage.
- Une exÃ©cution accidentelle de `bun test` depuis la racine a chargÃ© les variables du `.env` : un test dâ€™intÃ©gration a Ã©chouÃ© en P1000 avant toute Ã©criture; les imports dÃ©corateurs Nest ont aussi Ã©chouÃ© car cette commande a exÃ©cutÃ© les fichiers hors du workspace API. La suite correcte depuis `apps/api` passe; la base de dÃ©veloppement nâ€™a pas Ã©tÃ© modifiÃ©e.

### Lot 3.2 â€” validation stricte des dates CV dans le mobile

- RED: le test dÃ©diÃ© Ã©choue car `cv-validation.ts` nâ€™existe pas.
- GREEN: `isValidDateOnly` valide le format ISO et le calendrier grÃ©gorien (annÃ©es bissextiles comprises); le formulaire bloque les dates obligatoires et facultatives invalides avant lâ€™appel API.
- `bun test tests/cv-validation.test.ts`: 2 tests passent; `bun test` depuis `apps/mobile`: 16 tests passent.
- `bun run format:check`, `bun run lint` et `bun run typecheck` passent.
- La validation visuelle des messages prÃ¨s des champs et le parcours sur appareil restent Ã  faire; les erreurs sont pour lâ€™instant affichÃ©es dans le message global dâ€™aide/erreur.

## Suite autorisÃ©e / bloquÃ©e

- Continuer les changements indÃ©pendants des dÃ©cisions produit ouvertes.
- Les migrations de rÃ´les, cardinalitÃ©s dâ€™appartenance, pÃ©rimÃ¨tres CV et membership des conversations restent bloquÃ©es par les dÃ©cisions de lot 0 listÃ©es dans le TDD.
- Lâ€™intÃ©gration DB locale dÃ©pend dâ€™identifiants valides pour une base suffixÃ©e `_test`; ne pas contourner la vÃ©rification ou employer la base de dÃ©veloppement.

### Lot 3.2 — erreurs de validation par champ dans le CV

- RED: le test `validateCv` ne pouvait pas importer la fonction, car elle n’existait pas.
- GREEN: `validateCv` retourne les erreurs de champs requis, date de naissance, dates de sections et branche requise avec des clés par champ. `CvEditor` les rend en alerte sous les champs et efface l’erreur d’un champ lorsqu’il est corrigé.
- `bun test tests/cv-validation.test.ts` depuis `apps/mobile`: 3 tests passent, 14 assertions.
- `bun run typecheck` depuis `apps/mobile` et `bun run lint` depuis la racine passent.
- À faire dans le même lot: suite mobile complète, vérification format, parcours visuel Expo sur appareil/simulateur et tests composant d’ajout/suppression/sauvegarde.

### Lot 3.4 — sécurité du contenu PDF individuel

- RED: `bun test tests/cv-pdf.test.ts` ne pouvait pas résoudre le module `cv-pdf` avant son extraction.
- GREEN: `createCvHtml` a été extrait de l’écran et testé pour l’échappement des balises/attributs HTML, les caractères spéciaux, le texte malgache, les sections CV et les valeurs optionnelles vides.
- `bun test tests/cv-pdf.test.ts` depuis `apps/mobile`: 2 tests, 9 assertions passent.
- La suite mobile complète compte 17 tests verts après le lot 3.2; à relancer avec le test PDF ajouté. Typecheck, format et lint de la nouvelle extraction à relancer également.
- Le PDF partagé par Expo n’a pas été visualisé sur appareil; modèles spécifiques Tily/Mpanazava et export groupé restent ouverts.

### Vérification des lots CV 3.2 et 3.4

- `bun test` depuis `apps/mobile`: 19 tests passent, 51 assertions, 0 échec.
- `bun run typecheck` depuis `apps/mobile`: passe.
- `bun run lint` et `bun run format:check` depuis la racine: passent.
- Le test réel du parcours CV sur appareil et le rendu visuel PDF restent à effectuer manuellement; les composants React Native ne sont pas testés par un renderer dans la suite actuelle.

### Lot 0.1 — registre des décisions métier

- RED: le nouveau test `decisions-contract.test.ts` échoue car l’ADR ne contenait pas les trois décisions sur révocation de téléchargement, compatibilité de migration et objectifs de charge/service.
- GREEN: ADR 0001 liste maintenant 12 sujets avec un état explicite; les propositions restent marquées en attente/partielles. Un test vérifie aussi que les modèles métier dépendant de ces choix ne sont pas introduits prématurément dans le schéma Prisma.
- Les documents source métier et Product Brief mobile précisent que ces propositions ne sont pas des validations et pointent vers le registre.
- `bun test tests/decisions-contract.test.ts`: 2 tests passent, 29 assertions.
- `bun test` depuis `apps/api`: 33 tests passent, 10 tests DB/PostgreSQL ignorés faute de DB de test configurée.
- `bun run format:check`, `bun run lint` et `bun run typecheck` depuis la racine passent.
- Statut: registre et garde documentaire livrés; décisions métier toujours en attente de validation produit. Les lots 1 et suivants qui dépendent des cardinalités/permissions ne doivent pas coder de choix implicite.

### Lot 0.4 — tests des gardes de configuration et du seed

- RED: `bun test tests/environment-safety.test.ts` échoue car les helpers de configuration n’existent pas.
- GREEN: `createIntegrationEnv` valide les protocoles PostgreSQL, exige un nom de base terminant par `_test` et force `DATABASE_URL`/`NODE_ENV=test` dans les processus enfants. Le seed démo utilise maintenant des gardes testables qui refusent production et URL absente avant de créer le client Prisma.
- `bun test tests/environment-safety.test.ts`: 4 tests passent, 12 assertions.
- `bun test` depuis `apps/api`: 37 tests passent, 10 tests DB/PostgreSQL ignorés faute de DB de test locale.
- Typecheck complet, format check et lint passent.
- Le workflow GitHub Actions déjà présent n’a pas été exécuté à distance. Le test d’intégration DB local reste en attente d’identifiants valides; aucun test n’a migré ou écrit dans la base développeur.

#### Complément Lot 0.4 — garde de démarrage API sans base

- RED: le test d’absence de `DATABASE_URL` échoue car `database-config.ts` n’existe pas.
- GREEN: `PrismaService` utilise maintenant `requireDatabaseUrl` avant de construire l’adaptateur Prisma; l’absence de configuration échoue immédiatement avec l’erreur documentée.
- `bun test` depuis `apps/api`: 38 tests passent, 10 tests PostgreSQL sont ignorés, 0 échec. La suite de sécurité ciblée compte 5 tests / 14 assertions.
- `bun run typecheck`, `bun run format:check` et `bun run lint` passent.
- Le workflow CI distant et l’exécution réelle avec une base de test restent à vérifier.
