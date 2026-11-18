# Alignement des écrans mobiles sur les références — Design

## Intention

Faire évoluer l’application mobile FIVONDRONANA pour que ses écrans d’accès et ses écrans après connexion reprennent l’organisation visuelle des captures de `docs/screens/`. L’objectif est une interface native lisible et cohérente, où les marques officielles aident à reconnaître l’organisation et les branches sans remplacer les contenus ni les contrôles interactifs.

Les 13 fichiers de référence ont été parcourus; la capture WhatsApp est identique à `landing-page.jpeg`, soit 12 compositions distinctes. Les captures décrivent l’accueil, la connexion, la récupération de mot de passe, les archives, l’annuaire, les conversations, les détails de contacts, les notifications, les réglages et les vues/édition de CV.

## Objectifs

- Aligner les écrans mobiles existants sur la composition, la hiérarchie, les couleurs, les icônes et les marques des captures.
- Réutiliser les logos fournis, avec une présence contextuelle : marque Vonenina dominante à l’accueil, marques secondaires en bas à droite, petit repère d’organisation dans l’en-tête connecté, emblème de branche uniquement lorsqu’elle est connue.
- Préserver le fonctionnement existant des parcours et des intégrations API; un écran de démonstration reste explicitement identifié comme tel.
- Demander une confirmation native avant une déconnexion volontaire depuis Réglages. Annuler conserve la session; confirmer déclenche la déconnexion existante. La déconnexion forcée après changement de mot de passe reste immédiate.
- Respecter les petits écrans, les zones sûres, l’agrandissement du texte, les lecteurs d’écran et les tailles tactiles iOS/Android.

## Hors périmètre

- Créer les API et les modèles de données absents (archives, contacts, messagerie, notifications, récupération de mot de passe, profil administrable).
- Créer le portail web d’administration ou modifier le système de session/la sémantique de « Tsarovy aho ».
- Inventer un logo FIVONDRONANA distinct ou utiliser les captures comme fonds d’écran.
- Changer les règles métier, les routes API existantes ou le contenu des CV.

Les lacunes API sont décrites dans `apps/mobile/PRODUCT.md`; leur livraison fera l’objet de tâches fonctionnelles séparées et ordonnées après le travail d’alignement visuel.

## Approches considérées

1. **Aligner tous les écrans via les composants React Native existants (retenue).** Traiter les écrans par parcours, réutiliser le shell, les tokens, `BrandIcon` et les images réelles; préserver les comportements et états déjà en place. Cela couvre la demande de ressemblance à l’ensemble des références sans sacrifier accessibilité ni adaptation.
2. **Ne refaire que l’accueil et l’authentification.** Plus rapide, mais laisse les écrans connectés visuellement incohérents avec les références; non retenue.
3. **Afficher les captures comme images.** Fidélité immédiate mais contenu figé, contrôles non interactifs, adaptation et accessibilité insuffisantes; non retenue.

## Direction visuelle retenue

- Fond blanc et mise en page calme, principalement informationnelle.
- Rouge FIVONDRONANA pour l’action principale et la sélection; turquoise réservé aux actions documentaires; surfaces de lignes gris clair, séparateurs fins et texte noir lisible.
- Accueil : logo Vonenina au centre, nom et texte de bienvenue, action « Hiditra » clairement traitée, quatre marques secondaires alignées en bas à droite comme sur la référence.
- Connexion et récupération : barre de retour et titre, champs espacés et lisibles, marque Vonenina selon la composition des captures, bouton rouge pleine largeur; préserver les erreurs et états de soumission.
- Écrans connectés : marque d’organisation à gauche dans la barre supérieure, actions notification/recherche/profil à droite, cinq destinations avec icônes et libellés en navigation inférieure; destination active en rouge.
- Listes : lignes compactes et hiérarchie typographique calquées sur les captures d’archives, responsables, conversations, contacts et notifications. Les emblèmes Tily/Mpanazava ne sont employés que dans un contexte de branche reconnu.
- CV : formulaire natif et défilant pour l’édition; consultation et téléchargements restent des actions natives et accessibles. Aucune donnée réelle des captures n’est copiée dans le produit.
- Déconnexion : alerte système explicite, avec choix annuler/confirmer, avant d’appeler la fonction de sortie existante.

## Contraintes d’implémentation

- React Native/Expo, iOS et Android; conserver les bibliothèques et conventions déjà installées.
- Sources des marques : `apps/mobile/src/assets/`; ne pas modifier les fichiers de référence de `docs/screens/`.
- Langue par défaut malgache; conserver la copie existante et ses caractères accentués.
- Réutiliser les tokens de `apps/mobile/src/theme/tokens.ts` et le composant d’icônes partagées. Pas d’icône emoji.
- Ne pas prétendre qu’une action locale ou de démonstration est connectée à l’API.
- Le projet porte déjà des styles et des routes de démonstration; les changements doivent rester incrémentaux et éviter une réécriture générale de navigation.

## Critères d’acceptation

- Les parcours d’accès et les cinq sections principales présentent la hiérarchie et les repères de marque des captures correspondantes.
- Les cinq marques fournies sont présentes sur l’accueil selon la composition de référence : Vonenina au centre et les quatre autres marques en bas à droite; les marques ne sont pas dupliquées arbitrairement sur chaque écran.
- L’en-tête connecté et la navigation inférieure gardent leurs contrôles, libellés et icônes fonctionnels.
- Une demande d’annulation de déconnexion n’efface pas la session; une confirmation déclenche la déconnexion; la sortie après changement de mot de passe n’affiche pas une seconde confirmation.
- Les écrans restent utilisables sur petit écran et avec texte agrandi; les logos et icônes ont des descriptions accessibles pertinentes.
- Les tests existants restent verts et une vérification visuelle sur émulateur/appareil est effectuée pour les écrans modifiés.
