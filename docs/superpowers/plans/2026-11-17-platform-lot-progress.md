# SDD ledger — plan: docs/superpowers/specs/2026-11-17-fivondronana-remaining-work-tdd.md

## Exécution du 17 novembre 2026

### État de départ

- Checkout `master` propre avant les modifications; aucune modification antérieure n’a été écrasée.
- L’utilisateur a choisi de continuer dans le dossier actuel.
- Baseline `bun run test`: 20 tests passent et les 3 tests PostgreSQL sont ignorés faute de test DB dans l’environnement du processus.
- Baseline `bun run typecheck`: API et mobile passent.

### Lot 0.2 — contrat d’erreur, pagination, OpenAPI

- RED: `bun test tests/api-contract.test.ts` échoue d’abord car `api-errors.ts` n’existe pas.
- GREEN: 13 tests du contrat API passent; le test HTTP vérifie que le document OpenAPI publie les schémas d’erreur et de pagination.
- Modifications: format d’erreur stable sans détails internes en 5xx, extraction du chemin sans query string, pagination page/pageSize bornée (20 par défaut, maximum 100), plafond du numéro de page garantissant un offset sûr, helper de conversion en `skip/take`, `OpenAPI 0.1.0`, configuration centrale appliquée dans le bootstrap Nest.
- Vérifications à la fin du lot: lint, format, typecheck et tests unitaires passent.

### Lot 0.3 — tests HTTP / PostgreSQL

- Tests écrits: health, login, identité courante sans hash, validation avec enveloppe d’erreur, lecture/écriture CV, révocation de session.
- `bun run test:integration` vérifie que `DATABASE_URL_TEST` est une URL PostgreSQL et que le nom de base se termine par `_test`; il remplace ensuite `DATABASE_URL` du processus enfant par la valeur de test.
- Résultat local: P1000 sur `localhost:5432`, base `fivondronana_test`, avant l’application d’une migration. Aucun changement DB n’a été appliqué par cette exécution.
- Statut: non terminé tant que les tests HTTP/PostgreSQL ne passent pas avec les bons identifiants du bac à sable de test.

### Lot 0.4 — pipeline qualité

- Le workflow `.github/workflows/quality.yml` préexistant crée un service PostgreSQL nommé `fivondronana_test`, applique les migrations et exécute format, lint, typecheck, tests et build API.
- Workflow distant non exécuté ici; aucune réussite CI n’est revendiquée.

### Lot 3.1 — dates CV

- RED: deux nouveaux cas démontrent que `1990-02-30` et `2026-02-30` étaient acceptés par la validation par défaut.
- GREEN: les dates de naissance, branches et activités utilisent `IsDateString({ strict: true, strictSeparator: true })`; les deux cas passent.
- La transaction de persistance du CV reste à vérifier dans le test PostgreSQL isolé.

### Lot 3.2 — protection des modifications CV

- RED: `bun test tests/cv-dirty.test.ts` échoue avant la création du helper de comparaison.
- GREEN: 3 tests couvrent l’état inchangé, les modifications de champ/ligne imbriquée et l’égalité par valeur entre objets distincts.
- `CvEditor` compare le formulaire à la dernière version chargée ou enregistrée; le retour affiche une confirmation destructive si le formulaire a changé. Après sauvegarde réussie, la nouvelle réponse API devient la référence propre.
- `bun run typecheck` passe; le test ciblé mobile passe. La confirmation native reste à valider sur appareil/simulateur.

### Validation globale après lots 0.2, 0.3, 3.1 et 3.2

- `bun run format:check`: passe après formatage du test API mobile.
- `bun run lint`: passe.
- `bun run typecheck`: passe.
- `bun run test`: API 27 tests passent, mobile 14 passent; 10 tests PostgreSQL sont ignorés car la base test n’est pas accessible/configurée dans l’environnement.
- `bun run test:integration`: toujours bloqué par P1000 sur `fivondronana_test`; ne pas confondre avec une validation d’intégration réussie.

### Reprise du contrat pagination

- RED: le nouveau test ne pouvait pas s’exécuter car `getPaginationOffset` n’existait pas; le cas de numéro de page extrême a été ajouté au même jeu de validation.
- GREEN: le DTO borne `page` pour que `(page - 1) * pageSize` reste dans `Number.MAX_SAFE_INTEGER`; `getPaginationOffset` retourne `{ skip, take }` pour Prisma.
- `bun test tests/api-contract.test.ts`: 15 tests passent, incluant rejet de la page démesurée et offset correct pour page 3 / taille 25.
- Après ce complément, `bun run test` passe avec 29 tests API et 14 tests mobile; 10 tests PostgreSQL restent ignorés. `bun run format:check`, `bun run lint` et `bun run typecheck` passent.

### Garde des helpers de pagination

- RED: le test de contrat montre que `createPaginatedResponse` accepte `total = -1` et renvoie `totalPages: -0`.
- GREEN: les helpers rejettent les totaux négatifs/non sûrs, les pages ou tailles hors bornes et les offsets non sûrs; la validation HTTP et les appels internes partagent maintenant les mêmes limites.
- `bun test tests/api-contract.test.ts` depuis `apps/api`: 16 tests passent.
- `bun run format:check`, `bun run lint` et `bun run typecheck` passent. Une invocation depuis la racine avec un chemin relatif au workspace API a chargé les métadonnées Nest hors de l’ordre attendu; le test ciblé depuis `apps/api` passe correctement.

### Lot 3.1 — limites et caractères malgaches du CV

- Ajout d’un test de validation couvrant `firstName` à 100 caractères puis à 101, les accents malgaches et les textes Unicode dans les champs et sections répétées.
- Les limites déjà déclarées dans le DTO acceptent la valeur à la borne et rejettent le dépassement; aucun changement de règles n’a été nécessaire.
- `bun test tests/api-validation.test.ts`: 7 tests passent. `bun test` depuis `apps/api`: 31 passent, 10 PostgreSQL sont ignorés.
- `bun run format:check`, `bun run lint` et `bun run typecheck` passent après formatage.
- Une exécution accidentelle de `bun test` depuis la racine a chargé les variables du `.env` : un test d’intégration a échoué en P1000 avant toute écriture; les imports décorateurs Nest ont aussi échoué car cette commande a exécuté les fichiers hors du workspace API. La suite correcte depuis `apps/api` passe; la base de développement n’a pas été modifiée.

### Lot 3.2 — validation stricte des dates CV dans le mobile

- RED: le test dédié échoue car `cv-validation.ts` n’existe pas.
- GREEN: `isValidDateOnly` valide le format ISO et le calendrier grégorien (années bissextiles comprises); le formulaire bloque les dates obligatoires et facultatives invalides avant l’appel API.
- `bun test tests/cv-validation.test.ts`: 2 tests passent; `bun test` depuis `apps/mobile`: 16 tests passent.
- `bun run format:check`, `bun run lint` et `bun run typecheck` passent.
- La validation visuelle des messages près des champs et le parcours sur appareil restent à faire; les erreurs sont pour l’instant affichées dans le message global d’aide/erreur.

## Suite autorisée / bloquée

- Continuer les changements indépendants des décisions produit ouvertes.
- Les migrations de rôles, cardinalités d’appartenance, périmètres CV et membership des conversations restent bloquées par les décisions de lot 0 listées dans le TDD.
- L’intégration DB locale dépend d’identifiants valides pour une base suffixée `_test`; ne pas contourner la vérification ou employer la base de développement.

### Lot 3.2 � erreurs de validation par champ dans le CV

- RED: le test `validateCv` ne pouvait pas importer la fonction, car elle n�existait pas.
- GREEN: `validateCv` retourne les erreurs de champs requis, date de naissance, dates de sections et branche requise avec des cl�s par champ. `CvEditor` les rend en alerte sous les champs et efface l�erreur d�un champ lorsqu�il est corrig�.
- `bun test tests/cv-validation.test.ts` depuis `apps/mobile`: 3 tests passent, 14 assertions.
- `bun run typecheck` depuis `apps/mobile` et `bun run lint` depuis la racine passent.
- � faire dans le m�me lot: suite mobile compl�te, v�rification format, parcours visuel Expo sur appareil/simulateur et tests composant d�ajout/suppression/sauvegarde.

### Lot 3.4 � s�curit� du contenu PDF individuel

- RED: `bun test tests/cv-pdf.test.ts` ne pouvait pas r�soudre le module `cv-pdf` avant son extraction.
- GREEN: `createCvHtml` a �t� extrait de l��cran et test� pour l��chappement des balises/attributs HTML, les caract�res sp�ciaux, le texte malgache, les sections CV et les valeurs optionnelles vides.
- `bun test tests/cv-pdf.test.ts` depuis `apps/mobile`: 2 tests, 9 assertions passent.
- La suite mobile compl�te compte 17 tests verts apr�s le lot 3.2; � relancer avec le test PDF ajout�. Typecheck, format et lint de la nouvelle extraction � relancer �galement.
- Le PDF partag� par Expo n�a pas �t� visualis� sur appareil; mod�les sp�cifiques Tily/Mpanazava et export group� restent ouverts.

### V�rification des lots CV 3.2 et 3.4

- `bun test` depuis `apps/mobile`: 19 tests passent, 51 assertions, 0 �chec.
- `bun run typecheck` depuis `apps/mobile`: passe.
- `bun run lint` et `bun run format:check` depuis la racine: passent.
- Le test r�el du parcours CV sur appareil et le rendu visuel PDF restent � effectuer manuellement; les composants React Native ne sont pas test�s par un renderer dans la suite actuelle.
