# FIVONDRONANA — conception technique et TDD des travaux restants

**Statut :** plan de conception et d’implémentation; les décisions métier signalées « bloquantes » doivent être validées avant les migrations ou permissions qui en dépendent.

**Références :** [audit et plan initial](../plans/2026-11-17-full-platform-audit-plan-tests.md), [règles métier](../../Application%20mobile%20FIVONDRONANA.md), [ADR 0001](../../decisions/0001-platform-foundation.md), [produit mobile](../../../apps/mobile/PRODUCT.md), [design mobile](../../../apps/mobile/DESIGN.md), [captures d’écran](../../screens/).

## Avancement d’exécution

- **Lot 0.2 — terminé :** contrat d’erreur HTTP, pagination bornée en taille et en offset sûr, helper Prisma `skip/take`, OpenAPI versionné; tests unitaires et document OpenAPI HTTP.
- **Lot 0.3 — en attente de validation DB locale :** tests HTTP NestJS/PostgreSQL écrits et commande d’intégration sécurisée ajoutée. L’exécution locale a été arrêtée par une erreur d’authentification PostgreSQL avant toute migration; `DATABASE_URL_TEST` doit correspondre à une base isolée terminée par `_test`.
- **Lot 0.4 — socle déjà présent :** le workflow CI contient PostgreSQL jetable, migrations et étapes de format/lint/typecheck/tests/build API; le workflow distant n’a pas été exécuté dans cette session.
- **Lot 3.1 — partiellement traité :** les dates impossibles du CV et des sections répétées sont désormais rejetées par validation stricte; la vérification transactionnelle sur PostgreSQL reste à exécuter dans le test isolé.
- **Lot 3.2 — partiellement traité :** l’éditeur mobile suit les changements non enregistrés et demande confirmation avant de quitter; la validation complète des interactions d’édition, des erreurs par champ et des longues valeurs reste à faire.
- **Décisions métier :** les choix ouverts du lot 0 restent à confirmer avant les migrations des domaines et les permissions qui en dépendent.

## 1. But et périmètre

Compléter la plateforme afin que les parcours visibles du mobile et du backoffice utilisent les mêmes données persistées, que l’API applique les permissions, et que chaque tâche soit livrée par un cycle TDD vérifiable. Le périmètre inclut le client mobile Expo, l’API NestJS/PostgreSQL/Prisma et le nouveau backoffice web.

Le dépôt audité contient `apps/api` et `apps/mobile`; `apps/backoffice` n’existe pas. L’API couvre santé, connexion/session, changement de mot de passe et CV du compte courant. Les domaines annuaire, administration, archives, contacts, conversations et notifications sont absents ou encore simulés dans le mobile. Le lot 0 est partiellement livré; consulter les cases cochées de l’audit initial avant chaque tâche.

### Hors périmètre de ce TDD

- Décider silencieusement les règles encore contradictoires ou imprécises listées en §3.
- Ajouter une inscription publique : les comptes de responsables sont créés par un administrateur.
- Réutiliser les captures d’écran comme assets de production ou utiliser les fixtures de démonstration dans une distribution.
- Déplacer des règles d’accès dans les clients : l’API demeure la source d’autorité.

## 2. Architecture cible

```text
Expo / React Native (apps/mobile) ─┐
                                   ├── HTTPS / JSON ── NestJS (apps/api) ── Prisma ── PostgreSQL
React / TypeScript (apps/backoffice)┘                         │
                                                             └── stockage privé de fichiers
```

- **API :** modules NestJS par domaine, DTO stricts à la frontière HTTP, services pour les règles métier, guards pour l’identité et les permissions, erreurs cohérentes, OpenAPI versionné. Le serveur vérifie l’autorisation pour chaque lecture, écriture, export et téléchargement.
- **Données :** PostgreSQL est la source de vérité; Prisma porte les relations et migrations. Les écritures multi-entités sont transactionnelles. Les migrations sont progressives et les contraintes BD protègent les invariants soumis à concurrence.
- **Mobile :** Expo/React Native, TypeScript strict, écrans alimentés par des services typés; états explicites chargement/erreur/vide/succès; jeton en stockage sécurisé; cache privé invalidé à la déconnexion, à l’expiration et au retrait des droits.
- **Backoffice :** application web responsive React/TypeScript dans `apps/backoffice`, consommant les contrats HTTP de l’API. L’authentification, le transport du jeton et l’hébergement restent à confirmer en lot 0. Aucune logique métier d’autorisation ne dépend de l’interface.
- **Contrats :** exposer uniquement des types neutres aux clients (types de réponse/contrats), sans partager les modèles Prisma ou importer du code serveur dans le mobile.
- **Fichiers :** stockage privé derrière une interface de stockage; les routes délivrent un fichier ou une URL signée courte après contrôle de permission. Les limites de taille/types, antivirus éventuel, rétention et versions restent des décisions à enregistrer avant les lots fichiers.

### Conventions de dossiers proposées

```text
apps/api/src/modules/<domain>/       contrôleur, service, DTO, policy
apps/api/tests/                      unitaires et HTTP/intégration par domaine
apps/api/prisma/                     schéma et migrations
apps/mobile/src/<domain>/            écran, service API, hook/état, validation
apps/mobile/tests/                   règles d’état, composants et parcours
apps/backoffice/src/<domain>/        routes, pages, composants, service API
apps/backoffice/tests/               unitaires, composants et parcours navigateur
packages/contracts/                  contrats HTTP neutres (uniquement si la duplication apparaît)
```

Ne créer `packages/contracts` qu’au premier contrat réellement partagé; garder un seul contrat de référence et vérifier sa compatibilité par les tests API et clients.

## 3. Décisions bloquantes du lot 0

Mettre chaque décision dans l’ADR avec date, validateur, choix et impact sur les données/tests.

1. **Appartenances :** les règles disent à la fois une seule entité/groupe par responsable et un accès possible à plusieurs conversations d’entité. Confirmer cardinalités et éventuelles exceptions.
2. **Rôles :** préciser les opérations par rôle, les périmètres, le cumul administrateur/responsable et le rôle de responsable général.
3. **Visibilité CV :** préciser consultation/export individuel et groupé, par rôle et entité.
4. **Responsabilités :** valider le catalogue initial et les droits de création/retrait.
5. **Session/récupération :** canal de récupération, durée, persistance « se souvenir de moi », rotation/révocation et comportement après désactivation.
6. **Fichiers :** formats réels, taille maximale par usage, stockage, version/rétention, analyse antivirus et partage externe.
7. **Notifications/recherche :** origine, lecture, suppression/annulation, périmètre et domaines consultables.
8. **Profil et cycle de vie :** champs modifiables par le responsable, suppression/anonymisation et conservation.
9. **Backoffice :** valider React/TypeScript proposé, transport d’authentification navigateur, hébergement et stockage de fichiers.
10. **Révocation de fichiers :** confirmer si les liens de téléchargement doivent cesser immédiatement après le retrait d’un droit. Proposition technique : chaque téléchargement repasse par l’API qui revérifie l’accès; ne pas remettre d’URL de stockage durable. Une URL signée implique une fenêtre de validité résiduelle.
11. **Compatibilité des migrations :** confirmer s’il existe des déploiements/données réels ou d’anciennes versions mobiles à préserver. Proposition par défaut : migrations additives, maintien des contrats actuels `/auth/*` et `/cvs/me`, suppression/renommage uniquement après transition documentée.
12. **Charge cible :** définir les volumes attendus (utilisateurs, connexions simultanées, archives et pièces jointes, export groupé) et les objectifs de service (latence, disponibilité, RPO/RTO). Les tests de charge et choix streaming/jobs/stockage en dépendent.

Tant qu’une décision manque, le code dépendant doit échouer explicitement ou rester hors périmètre; ne pas coder une règle provisoire présentée comme métier confirmé.

## 4. Principes TDD et qualité communs

Pour chaque élément de travail ci-dessous, appliquer ce cycle avant de passer au suivant :

1. Écrire le test qui décrit le résultat utilisateur et les limites (happy path, entrée invalide, accès refusé ou panne pertinente).
2. Lancer uniquement le test ciblé et constater son échec pour la raison attendue.
3. Ajouter le minimum de code qui le fait réussir; les règles métier sont testées sur l’API même si le client les vérifie aussi.
4. Relancer le test ciblé, puis le paquet de tests du domaine; refactoriser en gardant les tests verts.
5. Finir la tâche avec format, lint et typecheck du workspace concerné. Les tests DB/API utilisent PostgreSQL de test isolé.

Une tâche n’est terminée que lorsque son contrat, ses tests, les états d’interface et sa documentation sont cohérents. Ne jamais utiliser `.env` réel ou une base développeur comme fixture de CI. Toute fixture démo reste explicitement réservée au développement/tests.

## 5. Tâches restantes par lots

Les chemins ci-dessous indiquent les responsabilités attendues; respecter les conventions déjà présentes si le code a évolué. Chaque ligne « tests d’abord » fait partie de la tâche, pas d’une phase de test différée.

### Lot 0 — décisions, contrats et socle de qualité (reste à terminer)

**0.1 Résoudre les décisions métier.** Mettre à jour `docs/decisions/0001-platform-foundation.md`, `docs/Application mobile FIVONDRONANA.md` et `apps/mobile/PRODUCT.md`. Ajouter un test de conformité documentaire/contrat vérifiant que les valeurs confirmées (cardinalités, rôles, limites, session) ont une représentation unique et que les éléments en attente ne sont pas codés comme invariants.

**0.2 [x] Contrat API et erreurs.** Écrire d’abord `apps/api/tests/api-contract.test.ts` : chaque erreur a le schéma stable choisi; pagination accepte les bornes et rejette les valeurs hors limites; les helpers refusent aussi les métadonnées invalides hors HTTP; l’OpenAPI expose les routes et DTO attendus. Implémenté dans `api-errors.ts`, `common/pagination.ts`, `openapi.ts` et `api-bootstrap.ts`; global prefix, filtre et schémas partagés sont branchés au démarrage.

**0.3 Tests HTTP réels.** Ajouter `apps/api/tests/http.integration.test.ts` avec l’application Nest réelle et PostgreSQL isolé. Tester health, login, `/auth/me`, logout, CV courant, validation et persistance. Les tests sont ajoutés; leur exécution locale reste à valider car les identifiants configurés pour `fivondronana_test` ont provoqué P1000 avant migration. `scripts/test-integration.ts` refuse les bases dont le nom ne finit pas par `_test` et passe explicitement `DATABASE_URL_TEST` à Prisma.

**0.4 CI reproductible.** Ajouter workflow CI pour install verrouillée, format check, lint, typecheck, unités, migration sur DB jetable, intégration, puis builds. Ajouter des tests de scripts/config qui détectent une variable requise absente, le seed démo en production et le démarrage sans base. La pipeline doit échouer sur n’importe quel étage rouge.

**Sortie/gate :** ADR relu, décisions nécessaires aux tâches 1–7 consignées, contrat d’erreurs/pagination et tests HTTP exécutables; pipeline verte sur checkout propre.

### Lot 1 — rôles, gestion de comptes et backoffice initial

**1.1 Autorisation API.** Écrire `apps/api/tests/authz/*.test.ts` pour admin autorisé, responsable interdit, utilisateur désactivé, token absent/révoqué et périmètre refusé. Implémenter les rôles, policies/guards et leurs tests d’intégration HTTP. Les checks doivent couvrir accès par ID, listes et exports.

**1.2 Modèle compte et audit.** Tests d’intégration avant migration : unicité email/téléphone normalisés même en concurrence, affectations conformes aux décisions, désactivation et révocation atomique, conservation/audit. Ajouter modèles Prisma et migration réversible selon politique choisie; tester rollback logique et intégrité relationnelle.

**1.3 API CRUD administrateur.** Dans `apps/api/tests/users/*.test.ts`, tester liste/recherche/pagination, création sans inscription publique, modification, affectation et désactivation/réactivation; assertions de statut, réponse sans hash/secret et absence de mutation sur validation refusée. Implémenter services/DTO/contrôleur sous `modules/users`.

**1.4 Connexion backoffice.** Créer `apps/backoffice`; écrire tests de garde de route (sans session, expirée, rôle responsable, admin), connexion, déconnexion et refresh avant pages. Implémenter le shell, formulaire accessible et stockage navigateur défini par ADR. Aucun secret ni session ne doit être rendu dans le HTML public.

**1.5 Gestionnaire d’utilisateurs web.** Tests de composant/parcours pour recherche, pagination, formulaire requis, erreurs serveur, double soumission, confirmation de désactivation et affichage des responsabilités. Implémenter la liste et formulaires qui consomment l’API; vérifier le résultat du CRUD par une relecture de l’API.

**1.6 Session mobile et récupération.** Avant le code, tester restauration sans flash de contenu privé, expiration, déconnexion offline/online, récupération existant/inexistant, rate limit et révocation. Utiliser un stockage sécurisé Expo et `/auth/me`; implémenter la politique de récupération seulement après validation produit.

**Sortie/gate :** un admin gère un compte, un responsable se connecte sur mobile, et la désactivation invalide toute session; toutes les routes admin sont testées contre un responsable.

### Lot 2 — référentiels et annuaire

**2.1 Référentiels.** Tests API/DB avant migration : groupes, entités et responsabilités, unicité, désactivation d’une valeur déjà affectée et règles d’affectation. Implémenter les modèles/routes nécessaires et leurs écrans de gestion backoffice.

**2.2 Annuaire API.** Tester `GET /api/leaders` pour autorisation, projection sans données privées, recherche normalisée, combinaison de filtres, bornes de pagination, tri stable et absence de fuite hors périmètre. Implémenter le service, DTO query, index DB et tests HTTP.

**2.3 Annuaire mobile réel.** Tests de service/composant couvrant chargement, succès, vide, retry, filtre combiné, recherche, rafraîchissement, pagination et changement de permission. Connecter `MainShell` au service; supprimer les imports de `sample-data.ts` des écrans de production et garder les jeux d’essai dans `tests/`.

**2.4 Profil et photo.** Tester type/taille/image invalide, URL de fichier, absence de photo, cache périmé après remplacement et accès à un profil protégé. Implémenter stockage privé et rendu avec fallback après décision des limites.

**Sortie/gate :** aucun responsable nommé dans des données de démonstration n’apparaît en production; liste et filtres viennent de l’API.

### Lot 3 — CV complet, consultation autorisée et PDF

**3.1 Validation et persistance CV.** Tests unitaires DTO/domain pour champs requis, espaces, dates, Unicode, longueurs, tableaux répétés et transaction préservant l’ancienne version. Les dates calendaires impossibles sont rejetées avec `IsDateString({ strict: true, strictSeparator: true })`; la validation accepte aussi les caractères malgaches accentués et couvre les limites de longueur exactes. La preuve transactionnelle reste à faire en intégration PostgreSQL.

**3.2 Édition mobile.** Tests unitaires ajoutés pour l’état propre/modifié (champs et lignes imbriquées) et la validation des dates calendaires; `CvEditor` conserve une référence de la dernière version chargée/enregistrée et demande confirmation avant de quitter les changements non sauvegardés. Les erreurs des champs obligatoires, dates et lignes de branche sont maintenant calculées par champ, annoncées en alerte sous le contrôle concerné et retirées à la correction. Tester encore l’ajout/modification/suppression de sections, sauvegarde/échec/retry, la confirmation sur appareil et les valeurs longues. Relier tous les contrôles de `CvEditor` à l’état/API; ne pas perdre de saisie après validation.

**3.3 Lecture d’un autre CV et permissions.** Tests API par propriétaire, responsable autorisé, hors périmètre et admin; tester aussi ID direct et liste. Ajouter routes/service de lecture seulement après approbation de la matrice de visibilité; connecter l’écran détail et enlever ses valeurs tirets.

**3.4 Export PDF individuel et groupé.** Génération HTML de l’export individuel isolée dans un helper et couverte par tests d’échappement HTML, texte malgache, sections et champs optionnels vides; le partage Expo conserve son comportement existant. Restent à tester le contenu exact/long, les modèles Tily/Mpanazava, l’export groupé autorisé, les gros volumes et les refus avant création d’artefact; audit pour export sensible.

**Sortie/gate :** un propriétaire édite uniquement son CV; un utilisateur autorisé reçoit des données et PDF actuels; toute interdiction est appliquée par l’API.

### Lot 4 — archives et documents

**4.1 Port de stockage.** Tests contractuels du port `FileStorage` (put/get/delete, nom sûr, checksum, objet privé, erreurs et nettoyage). Implémenter un adaptateur local de test et l’adaptateur d’environnement choisi; injecter le port dans le domaine.

**4.2 API archives.** Tests API/DB sur métadonnées, catégories/années, brouillon/publication, version/remplacement, suppression logique, limite, magic bytes/MIME/extension, fichier corrompu, traversal et refus d’accès/download par URL devinée. Ajouter modèle, migration, DTO, service et contrôleur.

**4.3 Backoffice archives.** Tests navigateur pour dépôt valide/invalide, progression/erreur, aperçu métadonnées, publication, remplacement et confirmation retrait. Implémenter le CRUD admin sans exposition des fichiers privés.

**4.4 Mobile archives.** Tests sur liste/recherche/filtres/empty/error/retry, octets et nom de téléchargement, lecture PDF et fallback Word, offline, espace insuffisant et reprise. Connecter la vue; préserver l’original octet pour octet.

**Sortie/gate :** uniquement PDF/Word conformes à la politique validée; pas d’accès public direct ou après retrait.

### Lot 5 — contacts

**5.1 API et modèle contact.** Tests API/DB sur contact interne/externe, champs obligatoires, format email/téléphone, publication, brouillon, recherche et pagination. Implémenter le modèle, CRUD admin et projection publique sans champs non publiés.

**5.2 Backoffice contacts.** Tester création/modification/retrait, validations, annulation de suppression et relecture après mutation; connecter l’interface aux routes.

**5.3 Mobile contacts.** Tester liste API, recherche accentuée, détails masqués par défaut et révélés à la demande, liens tel/mail valides et rejet des URI malformées. Retirer les mocks de contact et invalidation au retrait.

**Sortie/gate :** la prochaine lecture mobile montre les contacts publiés actuels; aucun brouillon n’est exposé.

### Lot 6 — conversations, membership et autorisation

**6.1 Domaine et administration.** Tests DB/API avant migration sur conversation générale/privée, unicité du salon général, périmètre entité, membres, désactivation, historique et opérations atomiques. Implémenter les modèles, index et CRUD admin après validation de cardinalité.

**6.2 Isolation serveur.** Tests HTTP négatifs systématiques : membre A et B, non-membre, compte désactivé, session révoquée, ID deviné, pièce jointe devinée, recherche et historique. Implémenter une policy commune pour chaque route; aucun endpoint ne réutilise un filtre client comme autorisation.

**6.3 Message texte et pagination.** Tests de longueur, vide/espaces, Unicode, doublon/idempotence, ordre stable et curseur. Implémenter envoi et historique avec tests d’intégration Postgres.

**6.4 Transport temps réel.** Avant choix, tester contrat d’abonnement et révocation en cours de connexion; définir WebSocket/SSE/polling dans ADR, puis tester token invalide, membre retiré et reconnexion sans fuite d’événement.

**Sortie/gate :** isolation par salon prouvée par tests serveur et révocation effective au prochain fetch/événement.

### Lot 7 — chat mobile et pièces jointes

**7.1 UI de conversation.** Tests service/composant de liste autorisée, historique paginé, ordre, état vide, pending/sent/failed, retry et doublon. Remplacer l’écran factice par l’API.

**7.2 Envoi et mise à jour.** Tests d’intégration à deux comptes/appareils logiques, message reçu une seule fois, connexion perdue/reprise, salon désactivé, membre retiré et cache privé nettoyé. Implémenter le transport sélectionné et son fallback.

**7.3 Upload et lecture sécurisés.** Tests de format, limite, fichier altéré, scan, interruption, annulation, permission après révocation et nettoyage temporaire. Implémenter upload/téléchargement via le port de stockage; livrer image/vidéo/document selon limites décidées.

**Sortie/gate :** seuls les membres voient l’historique et les fichiers; un retry réseau ne crée pas de doublon silencieux.

### Lot 8 — recherche, notifications, compte et derniers mocks

**8.1 Recherche globale.** Tests API par type de ressource, pagination, accents, query vide, résultats hors périmètre et injection; implémenter une recherche bornée à l’autorisation serveur et un état UI explicite.

**8.2 Notifications.** Tests multi-session/appareils sur lecture, compteur, masquage/restauration et source d’événement; modéliser et relier au serveur seulement selon la décision produit.

**8.3 Paramètres et profil.** Tests autorisant les champs listés comme éditables et refusant entité/responsabilités; implémenter la mise à jour API/UI avec relecture après reconnexion.

**8.4 Inventaire de mocks.** Ajouter un contrôle statique (ou test d’assemblage) empêchant l’import de `sample-data` hors `tests`/mode démo; parcourir chaque bouton visible, ajouter un test de résultat effectif, relier à API ou retirer/indiquer indisponible.

**Sortie/gate :** aucun bouton visible n’est muet et aucun contenu de démonstration n’est inclus dans une distribution.

### Lot 9 — durcissement et livraison

**9.1 Test de parcours bout en bout.** Automatiser création compte admin → login mobile → CV → lecture archive/contact → conversation autorisée → retrait membership/désactivation; exécuter sur environnement éphémère CI.

**9.2 Revue sécurité et résilience.** Tests rate limit, secrets/logging, CORS, permissions, injections, fichiers, sauvegarde/restauration, migration en échec et observabilité. Corriger avant qualification.

**9.3 Tests appareils et backoffice.** Exécuter matrice iOS/Android et navigateur/clavier/lecteur d’écran/zoom; vérifier zones sûres, barre d’état, clavier, navigation, téléchargements et réseau faible.

**9.4 Release candidate.** Construire depuis checkout propre, migrer staging, smoke tests, vérifier plan de retour arrière et sauvegarder/restaurer. Bloquer la livraison tant qu’un P0/P1 ou un test obligatoire est rouge.

**Sortie/gate :** critères §7 du cahier de tests satisfaits, propriétaires métier signent les règles et la checklist de release.

## 6. Dépendances et ordre

`Lot 0 → Lot 1 → Lot 2 → (Lot 3 lecture autorisée / Lot 4 / Lot 5 en parallèle après contrats) → Lot 6 → Lot 7 → Lot 8 → Lot 9`.

L’édition du CV courant peut avancer indépendamment du droit de lire les CV d’autres comptes. Le lot 7 dépend du modèle et des vérifications de membership du lot 6. Les uploads des lots 4/7 dépendent du contrat de stockage et des limites validées. Les rôles, appartenance et permissions doivent être acceptés en lot 0 avant toute migration qui les encode.

## 7. Définition de terminé par tâche

- Test ciblé écrit avant code, vu échouer pour la raison attendue, puis vert après implémentation.
- Tests positifs, négatifs, validation et régression de permission pertinents présents.
- Format, lint et TypeScript propres dans le workspace; intégration PostgreSQL isolée verte si le domaine écrit en base.
- Migration relue; aucun secret ni fixture privée dans logs, réponses ou bundle.
- Chargement, erreur, vide, succès, accessibilité et retry présents si la tâche touche l’interface.
- Contrat OpenAPI, règles métier, guide local et cahier de tests à jour.
- Test utilisateur de bout en bout/matrice d’appareils ajouté au lot ou à la porte de release propriétaire.

## 8. Risques et choix restant à la réalisation

- Les neuf décisions §3 peuvent changer les cardinalités, API et fixtures; c’est le risque principal de reprise de schéma.
- Le stockage de fichiers et l’authentification web doivent être sélectionnés selon l’environnement réel avant les implémentations dépendantes.
- Le mode de révocation des téléchargements, la compatibilité avec d’éventuels clients déjà distribués et les objectifs de charge/RPO/RTO restent à trancher; le §3 donne les questions et propositions initiales.
- Les références d’écran sont des images statiques; elles ne définissent pas les erreurs, états de chargement ou comportements accessibles.
- Une génération PDF côté client ou serveur est acceptable uniquement après décision sur modèles et droits; les tests de sécurité ne doivent pas dépendre du choix d’implémentation.
- L’intégration mobile sur appareil réel et restauration de sauvegarde ne sont pas remplaçables par des tests unitaires.
