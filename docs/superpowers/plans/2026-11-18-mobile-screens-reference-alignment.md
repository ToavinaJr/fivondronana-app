# Alignement des écrans mobiles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aligner les écrans mobiles FIVONDRONANA sur les captures fournies, afficher les marques aux bons endroits et confirmer toute déconnexion volontaire.

**Architecture:** Conserver l’application React Native/Expo et ses écrans, reducers, appels API et tokens existants. Appliquer la direction de référence progressivement par parcours, avec les assets de marque existants, puis contrôler les parcours en capture native sans utiliser les images de référence comme écrans.

**Tech Stack:** React Native 0.88, Expo 58, TypeScript, `expo-symbols`, Bun Test.

**Spec:** `docs/superpowers/specs/2026-11-18-mobile-screens-reference-alignment-design.md`

## Global Constraints

- « Fond blanc et mise en page calme, principalement informationnelle. »
- « Rouge FIVONDRONANA pour l’action principale et la sélection; turquoise réservé aux actions documentaires. »
- « Langue par défaut malgache; conserver la copie existante et ses caractères accentués. »
- « Réutiliser les tokens de `apps/mobile/src/theme/tokens.ts` et le composant d’icônes partagées. Pas d’icône emoji. »
- « Le projet porte déjà des styles et des routes de démonstration; les changements doivent rester incrémentaux et éviter une réécriture générale de navigation. »
- « Respecter les petits écrans, les zones sûres, l’agrandissement du texte, les lecteurs d’écran et les tailles tactiles iOS/Android. »
- Ne pas modifier les données ou les références de `docs/screens/`; ne pas ajouter de comportement API dans cette refonte.

## Review Focus

- Annuler l’alerte de déconnexion doit conserver la session et ne déclencher aucun appel de sortie — test de la configuration de confirmation dans la tâche 1.
- Confirmer l’alerte doit appeler la sortie une seule fois — test du callback confirmé dans la tâche 1.
- La déconnexion forcée après changement de mot de passe doit rester directe et ne pas ouvrir l’alerte — vérification manuelle du parcours Réglages dans la tâche 1.
- Sur un écran étroit ou avec texte agrandi, les logos, champs et libellés malgaches ne doivent ni se chevaucher ni sortir des zones sûres — capture de contrôle dans la tâche 6.
- Une branche inconnue ne doit pas afficher l’emblème d’une autre branche — vérification de l’annuaire et des CV dans les tâches 4 et 5.

---

### Task 1: Confirmation de déconnexion

**Files:**
- Create: `apps/mobile/src/main/sign-out-confirmation.ts`
- Modify: `apps/mobile/src/main/MainShell.tsx`
- Test: `apps/mobile/tests/sign-out-confirmation.test.ts`

**Interfaces:**
- Produit `getSignOutConfirmation(onConfirm: () => void)` retournant le titre, le message et les deux boutons natifs de l’alerte.
- `MainShell` affiche cette confirmation uniquement lorsque l’utilisateur appuie sur « Hiala amin’ny kaonty ».
- La fermeture ou l’annulation ne modifie aucun état; le bouton destructif appelle `onSignOut` une seule fois.
- Le rappel après changement de mot de passe continue d’appeler `onSignOut` directement.

- [ ] **Step 1: Écrire le test qui échoue** — vérifier titre/message, libellés, rôle d’annulation, que l’action d’annulation n’appelle pas le callback et que l’action destructive l’appelle une fois.
- [ ] **Step 2: Vérifier l’échec** — `bun test tests/sign-out-confirmation.test.ts` depuis `apps/mobile`; attendu : échec car le constructeur de confirmation n’existe pas.
- [ ] **Step 3: Implémenter `getSignOutConfirmation` et brancher `Alert.alert` au bouton de déconnexion volontaire.** Garder le parcours forcé après changement de mot de passe hors de cette alerte.
- [ ] **Step 4: Vérifier le test ciblé et le parcours** — relancer la commande du Step 2; ouvrir Réglages, annuler puis confirmer, puis vérifier le changement de mot de passe.
- [ ] **Step 5: Commit** — `git add apps/mobile/src/main/sign-out-confirmation.ts apps/mobile/src/main/MainShell.tsx apps/mobile/tests/sign-out-confirmation.test.ts && git commit -m "feat(mobile): confirm voluntary sign out"`.

### Task 2: Marque et logos des écrans d’accès

**Files:**
- Create: `apps/mobile/src/access/access-logo-manifest.ts`
- Modify: `apps/mobile/src/access/AccessScreens.tsx`
- Modify: `apps/mobile/src/access/Brand.tsx`
- Test: `apps/mobile/tests/access-branding.test.ts`

**Interfaces:**
- `access-logo-manifest.ts` expose les quatre marques secondaires et leurs noms accessibles dans l’ordre de la capture : `sampana`, `sampana-manga`, `tily`, `mpanazava`.
- Les sources restent des imports statiques provenant de `apps/mobile/src/assets/`; la marque Vonenina reste l’image centrale de l’accueil et la marque compacte sur la connexion.
- L’accueil affiche les quatre marques secondaires en bas à droite, sans les répéter sur les écrans de connexion/récupération.

- [ ] **Step 1: Écrire un test échouant** — vérifier l’ordre des quatre identifiants et que chacun dispose d’un nom accessible non vide.
- [ ] **Step 2: Vérifier l’échec** — `bun test tests/access-branding.test.ts` depuis `apps/mobile`; attendu : échec car le manifeste n’existe pas.
- [ ] **Step 3: Ajouter le manifeste et implémenter les marques** — utiliser `Image` avec `resizeMode="contain"`, noms accessibles et mise en page qui reste dans la zone sûre; remplacer le simple wordmark des écrans concernés par le logo Vonenina fourni selon la composition de référence.
- [ ] **Step 4: Vérifier les tests et l’affichage** — test ciblé, puis captures native accueil/connexion/récupération; comparer à `landing-page.jpeg`, `auth-page.jpeg` et `forgot-password-page.jpeg`.
- [ ] **Step 5: Commit** — `git add apps/mobile/src/access apps/mobile/tests/access-branding.test.ts && git commit -m "feat(mobile): align access branding with references"`.

### Task 3: Barre d’application et navigation principale

**Files:**
- Modify: `apps/mobile/src/main/MainShell.tsx`
- Modify: `apps/mobile/src/access/BrandIcon.tsx` uniquement si un symbole déjà disponible ne couvre pas une icône de référence.
- Test: captures natives des cinq onglets et d’un écran de détail.

**Interfaces:**
- Préserver le type `MainTab`, le tableau `tabs`, `mainFlowReducer` et les callbacks de navigation existants.
- Barre supérieure : marque d’organisation à gauche; notification, recherche et compte à droite sur les sections principales; retour et titre contextuel dans les détails.
- Barre inférieure : les cinq destinations existantes dans l’ordre, avec icône et libellé; état actif rouge et états accessibles `tab`/`selected`.

- [ ] **Step 1: Vérifier le test visuel avant changement** — ouvrir les cinq onglets et un détail CV sur émulateur/appareil; comparer aux références et consigner les écarts actuels de marque, alignement, icônes, séparateurs et sélection active.
- [ ] **Step 2: Corriger le shell d’après les échecs visuels** — aligner hauteur, alignements, espacements, séparateurs, icônes et couleurs sur les captures, sans ajouter de destination ou supprimer de contrôle.
- [ ] **Step 3: Vérifier les parcours** — `bun test tests/main-flow.test.ts` puis vérifier onglets, notifications, recherche, retour de détail et labels screen-reader sur capture native.
- [ ] **Step 4: Commit** — `git add apps/mobile/src/main/MainShell.tsx apps/mobile/src/access/BrandIcon.tsx && git commit -m "style(mobile): align app navigation with references"`.

### Task 4: Écrans de listes et contenus connectés

**Files:**
- Modify: `apps/mobile/src/main/MainShell.tsx`
- Modify: `apps/mobile/src/main/LeaderDirectoryScreen.tsx`
- Modify: `apps/mobile/src/main/sample-data.ts` uniquement si nécessaire pour corriger ou typer les marques déjà utilisées; ne pas ajouter de nouvelles données de démonstration.
- Test: captures natives correspondant à archives, annuaire, contacts, notifications et messages.

**Interfaces:**
- Préserver l’appel API de l’annuaire, les filtres, les états de chargement/erreur/vide, ainsi que les actions de consultation et d’export CV.
- Conserver les données locales de démonstration existantes et leur bannière d’avertissement; ne pas faire croire que les archives, contacts, notifications ou messages sont déjà raccordés.
- Employer Tily/Mpanazava uniquement lorsque le groupe est connu; sinon conserver l’initiale ou l’avatar neutre existant.

- [ ] **Step 1: Vérifier les tests visuels avant changement** — ouvrir archives, annuaire, contacts, notifications et messages; comparer aux captures pour relever les écarts de ligne, filtres, logos et hiérarchie. Dans l’annuaire, confirmer qu’un groupe non reconnu reçoit l’initiale neutre, pas un emblème incorrect.
- [ ] **Step 2: Corriger les surfaces de liste d’après les écarts constatés** — appliquer ligne compacte, séparateur, hiérarchie de texte, filtres et actions visibles sans changer les sources de données ou le routage.
- [ ] **Step 3: Vérifier les données et navigation** — `bun test tests/leader-api.test.ts tests/leader-list-state.test.ts tests/main-flow.test.ts` depuis `apps/mobile`; vérifier recherche, filtres, actualisation, ouverture CV et expansion contact sur appareil.
- [ ] **Step 4: Commit** — `git add apps/mobile/src/main/MainShell.tsx apps/mobile/src/main/LeaderDirectoryScreen.tsx apps/mobile/src/main/sample-data.ts && git commit -m "style(mobile): align directory and list screens"`.

### Task 5: Consultation et édition des CV

**Files:**
- Modify: `apps/mobile/src/main/LeaderCvScreen.tsx`
- Modify: `apps/mobile/src/main/CvEditor.tsx`
- Modify: `apps/mobile/src/main/cv-pdf.ts` uniquement si une modification visuelle du PDF est nécessaire pour respecter la maquette; garder son contenu métier intact.
- Test: `apps/mobile/tests/cv-pdf.test.ts`, `apps/mobile/tests/cv-validation.test.ts`, `apps/mobile/tests/cv-dirty.test.ts` et captures natives.

**Interfaces:**
- Garder le CV d’un autre responsable en lecture seule; garder la mise à jour du CV personnel par `getMyCv`/`saveMyCv`.
- Préserver les sections, champs obligatoires, ajout de champs/sous-sections, validation, protection des modifications non enregistrées, téléchargement et partage PDF.
- Garder les emblèmes de modèle conditionnels à `cv.template` connu.

- [ ] **Step 1: Vérifier les tests visuels avant changement** — capturer CV consulté et éditeur long; comparer à `hijery-cv-page.jpeg` et `hikira-cv-page.jpeg`; relever hiérarchie/espacement hors référence, champs qui débordent et emblème sans modèle connu.
- [ ] **Step 2: Corriger consultation et formulaire d’après les écarts constatés** — aligner titres, sections, champs, boutons et actions; laisser les libellés longs se replier.
- [ ] **Step 3: Vérifier la logique et l’affichage** — exécuter les trois fichiers de tests CV indiqués; contrôler validation, sauvegarde, sortie avec modifications, modèle et export PDF sur appareil.
- [ ] **Step 4: Commit** — `git add apps/mobile/src/main/LeaderCvScreen.tsx apps/mobile/src/main/CvEditor.tsx apps/mobile/src/main/cv-pdf.ts && git commit -m "style(mobile): align cv screens with references"`.

### Task 6: Vérification visuelle et responsive de l’ensemble

**Files:**
- Modify: les composants mobiles des tâches précédentes uniquement pour les corrections révélées par les captures.
- Verify: `apps/mobile/src/`, l’appareil ou l’émulateur Android disponible; consigner l’absence d’un simulateur iOS si celui-ci n’est pas disponible dans l’environnement Windows.

**Interfaces:**
- Aucun nouveau comportement; cette tâche vérifie le résultat complet par rapport aux références et aux contraintes adaptatives.

- [ ] **Step 1: Exécuter les tests mobiles** — `bun test` depuis `apps/mobile`; attendu : tous les tests mobile passent.
- [ ] **Step 2: Exécuter le typecheck mobile** — `bun run typecheck` depuis `apps/mobile`; attendu : TypeScript sans erreur.
- [ ] **Step 3: Capturer les écrans représentés** — accueil, connexion, récupération, cinq onglets, détail CV, éditeur CV et détail conversation si le parcours est présent; contrôler petit écran, texte agrandi et zones sûres.
- [ ] **Step 4: Corriger puis revalider** — corriger les chevauchements, mauvais logos, contrôles sans affordance et écarts évidents; rejouer tests, typecheck et capture après correction.
- [ ] **Step 5: Commit** — `git add apps/mobile/src && git commit -m "test(mobile): verify reference screen alignment"`.

## État d’exécution — 18 novembre 2026

- Implémentation effectuée dans le checkout courant, sans commit ni modification des changements documentaires déjà indexés.
- Accueil : logo Vonenina central et quatre emblèmes secondaires en bas à droite ; connexion et récupération partagent une barre de retour/titre accessible.
- Shell : logo connecté, cinq onglets avec icônes et libellés repliables ; recherche affichée uniquement sur les listes qu’elle filtre réellement ; indicateur de démonstration limité aux archives, contacts et notifications.
- Réglages : actions avec icônes/chevrons et confirmation native de déconnexion. La sortie automatique après changement de mot de passe reste directe.
- Annuaire : initiales pour les portraits, emblèmes contextuels pour les groupes reconnus, adaptation des actions sur petits écrans et avec texte agrandi. CV : consultation tabulaire et formulaire défilant avec actions explicites.
- API, contenu des PDF et données de démonstration inchangés. Aucun écran de conversation fictif ajouté.
- Revue indépendante : seule réserve relevée, la messagerie vide pouvait sembler opérationnelle. Corrigé avec une mention explicite d’indisponibilité de l’envoi/réception, sans données inventées.
- Vérifications : 37 tests mobiles passent, dont deux nouveaux tests de confirmation ; TypeScript sans erreur ; export Expo Android réussi avec les cinq images ; contrôle du diff sans erreur d’espacement.
- Le lint ciblé reste bloqué par trois erreurs préexistantes (dépendances de relance des effets et clés de lignes CV) et trois avertissements préexistants. Aucun correctif automatique risquant de retirer les relances n’a été appliqué.
- Vérification visuelle native **non réalisée** : ADB ne détecte aucun appareil/émulateur connecté. Les captures petit écran, texte agrandi, clavier, alertes système et iOS restent à valider ; la tâche 6 n’est donc pas entièrement terminée.
- Écart au plan : les images sont référencées directement par les composants, sans manifeste supplémentaire ni test reproduisant ces références. Les tests portent sur le comportement de confirmation.

## Suite fonctionnelle API (séparée de ce plan visuel)

Après la refonte visuelle, ordonner les projets d’API et leur interface mobile ainsi :

1. Archives et stockage/téléchargement sécurisé des documents.
2. Contacts et détails consultables à la demande.
3. Conversations, messages et autorisations; pièces jointes après décision sur formats et limites.
4. Notifications, après décision sur lecture et retrait.
5. Récupération du mot de passe et profil modifiable, après choix des fournisseurs email/SMS et des champs autorisés.
6. Provisionnement de comptes et portail backoffice administrateur.
7. Recherche globale et sémantique de « Tsarovy aho »/durée de session, après décision produit.

Ces projets nécessitent des spécifications séparées pour les décisions encore ouvertes. Cette liste ne les inclut pas dans la refonte visuelle et n’autorise pas à inventer ces règles.
