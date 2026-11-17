# Cahier de tests complet — FIVONDRONANA

**Version :** 17 novembre 2026  
**Statut :** référence de validation pour les lots restants; les critères dépendant d’une décision métier sont activés après sa validation.  
**TDD associé :** [TDD des travaux restants](../specs/2026-11-17-fivondronana-remaining-work-tdd.md).  
**Inventaire source :** [audit et plan initial](../plans/2026-11-17-full-platform-audit-plan-tests.md).

## Objectif et règle de passage

Ce cahier décrit les vérifications nécessaires pour accepter chaque lot, depuis les contrats API jusqu’aux appareils mobiles et au backoffice. Un scénario en attente d’une décision métier n’est pas supprimé : il est marqué comme bloqué par cette décision, puis devient un critère obligatoire dès que l’ADR fixe la règle. Aucun scénario de sécurité ne peut être « passé » en désactivant ou en contournant le contrôle côté serveur.

## Niveaux de test

| Niveau | Ce qu’il prouve | Exécution cible |
|---|---|---|
| Unitaire | Règles pures, validation, permissions et transitions d’état | À chaque tâche, `bun test` ciblé dans le workspace |
| Intégration | Prisma, contraintes, transactions, services et stockage | PostgreSQL jetable et migrations versionnées |
| HTTP/contrat | Statuts, corps, erreurs, OpenAPI, authentification et permissions | Application Nest testée avec requêtes HTTP et fixtures isolées |
| Composant/parcours client | États UI, interactions, navigation, accessibilité et API client | Tests mobiles et navigateur backoffice |
| E2E | Un scénario utilisateur traversant les clients, API et persistance | Environnement éphémère CI ou staging de test |
| Manuel sur appareil | Insets, barre d’état, clavier, fichiers, lecteur d’écran et réseau | Appareil ou simulateur iOS + appareil ou émulateur Android |
| Exploitation | Migrations, secrets, santé, sauvegarde/restauration et reprise | Staging isolé avec procédures répétables |

## Ordre TDD obligatoire

1. Ajouter un test ciblé avec l’entrée, l’acteur et le résultat attendu explicitement définis.
2. Le lancer et vérifier un échec dû au comportement absent (pas à une erreur de compilation non liée).
3. Implémenter le minimum sous test; ajouter les validations serveur même si le formulaire les reproduit.
4. Relancer le test ciblé puis les tests du domaine; garder une régression de permission pour chaque ressource privée.
5. Exécuter format check, lint et typecheck du workspace affecté; exécuter intégration si DB ou fichier impliqué.
6. Pour finir un lot, exécuter les scénarios E2E concernés et mettre à jour la preuve de passage ci-dessous.

## Commandes actuelles et cibles

Les commandes suivantes existent déjà pour les workspaces actuels : `bun run format:check`, `bun run lint`, `bun run typecheck`, `bun run test`, `bun run test:integration`, `bun run build:api`. Les tests d’intégration et builds backoffice/mobile dédiés doivent être ajoutés quand leurs tâches livrent les scripts correspondants. Ne jamais lancer une commande destructive de migration contre la base locale ou production; toute remise à zéro de tests pointe vers une base explicitement dédiée.

## Fixtures minimales

Utiliser des factories déterministes et identifiants jetables : un administrateur autorisé, un compte sans rôle admin, au moins trois responsables sur deux entités, un compte désactivé, un compte révoqué, CV complet/incomplet, archive publiée/brouillon, contact interne/externe, conversation générale et deux salons privés. Les tests d’isolation tentent toujours un accès direct par ID à une ressource appartenant à l’autre entité. Les secrets et contenus personnels sont synthétiques.

## Matrice de couverture par lot

| Lot | Scénarios bloquants avant sortie |
|---|---|
| 0 — décisions/socle | SYS-01 à SYS-08; contrat d’erreur, pagination, OpenAPI et tests HTTP de base |
| 1 — comptes/admin/session | AUTH-01 à AUTH-14; ADM-01 à ADM-14 |
| 2 — référentiels/annuaire | LEAD-01 à LEAD-08; tests d’unicité et d’affectations validées |
| 3 — CV/export | CV-01 à CV-14; autorisation par rôle/périmètre |
| 4 — archives/fichiers | ARC-01 à ARC-10; intégrité des octets et téléchargement autorisé |
| 5 — contacts | CON-01 à CON-07 |
| 6 — conversations/permissions | MSG-01 à MSG-07, MSG-10 à MSG-12; tests de révocation et d’accès par ID |
| 7 — chat/pièces jointes | MSG-08 à MSG-12; MOB-08 à MOB-10; tests d’upload et de reprise |
| 8 — recherche/notifications/compte | APP-01 à APP-08; test empêchant les mocks en production |
| 9 — release | SYS-01 à SYS-08; MOB-01 à MOB-12; OPS-01 à OPS-05; parcours E2E critiques |

## Priorité et sévérité

- **P0 — bloqueur :** fuite de données, contournement de permission, mauvais destinataire, corruption/perte de données, impossibilité de se connecter ou de terminer un parcours central.
- **P1 — majeur :** fonctionnalité centrale inaccessible à une partie des utilisateurs, données non à jour, upload/export incorrect, régression forte d’accessibilité ou d’usage.
- **P2 — standard :** défaut visuel ou cas de bord avec contournement raisonnable et sans risque sur les données.

Tout P0 et P1 doit être fermé avant release. Un test rouge est assigné à une tâche; il n’est jamais supprimé juste pour rendre la pipeline verte. Une exception de test flakey exige une correction ou une décision documentée avec échéance.

## Preuve de validation par lot

Pour chaque lot, consigner dans la PR ou le journal de release : commit, commandes et codes de sortie, migrations appliquées, matrice appareil/navigateur, scénarios manuels exécutés, anomalies P0/P1 restantes et personne ayant accepté les règles métier. Une réussite sur emulateur Android ne prouve pas le comportement iOS, et inversement.

## Scénarios détaillés

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
| CV-03 | Champ requis absent, espaces uniquement, date impossible (`2026-02-30`) ou format autre que `YYYY-MM-DD`; date future si interdite | Erreurs près du champ; client bloque les dates calendaires invalides et serveur rejette même si validation client contournée. |
| CV-04 | Email, téléphone, texte Unicode/Malagasy, accents et limites de longueur | Valeurs valides acceptées et conservées; valeurs excessives rejetées avec message utile. |
| CV-05 | Ajouter/éditer/supprimer 0, 1 et plusieurs lignes branches/activités | Ajouts/mises à jour/suppressions persistés; identifiants stables; pas de duplication à retry. |
| CV-06 | Ligne branche sans nom/groupe lorsque requis | Toute la transaction échoue, ancien CV intact. |
| CV-07 | Charger ou modifier `/cvs/:id` d’un autre utilisateur non autorisé | 403/404 selon politique; aucune donnée écrite ou révélée. |
| CV-08 | Utilisateur non connecté appelle routes CV | 401. |
| CV-09 | Deux sauvegardes concurrentes du même CV | Pas de perte silencieuse non définie; stratégie de version/dernier-write convenue. |
| CV-10 | Quitter l’éditeur avec modifications non enregistrées | Avertissement; confirmer abandon réinitialise, annuler conserve les changements. Le calcul propre/modifié est couvert par tests unitaires; l’interaction native reste à vérifier sur appareil/simulateur. |
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

