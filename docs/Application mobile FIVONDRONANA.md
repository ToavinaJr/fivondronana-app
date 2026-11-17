# Application mobile FIVONDRONANA: 

Application mobile fait pour les responsables des entités dans une association scoutisme “FIVONDRONANA”, les objectifs de l’application sont les suivantes: 

- Informer les historique de FIVONDRONANA de generation en generation (pdf deja fait mais intégrer la lecture dans l’application) 

- Pour facilité l’accée aux archives (modéle de demande – modéle fiche technique) 

- Les responsable de chaque entité (mavo,maitso, mena, menafify) doit s’authentifier et voir les cv scoutisme de chaque responsable(Mpiandraikitra), peut CRUD son cv peut faire une conversation entre eux pour chaque entités. 

# remarques: 

- Langue utilisées : Malagasy 

- Chaque entités peut avoir plusieurs responsable et les message de chaque entités sont privées donc les un ne peut pas voire les autre mais ils y a une message pour tous les responsable 

- Si je veux une cv d’un responsable je peut le telecharger 

- Je peut voir et telecharger en pdf tous cv des responsable(Mpiandraikitra) 

Pages requis: 

- Recéption 

   - Logo 

   - Button hiditra: “HIDITRA”  (email ou num tel, mot de passe) 

Les pages suivant sont sur le tab bar 

* Mpiandraikitra: c’est ici qu’on à lister la resume la plus courte de chaque responsable (nom du compte, photos,responsabilité,entité. 

* Archiva : On trouve dans cette page les liste des archive en format pdf ou world quand peut lire et télécharger. 

* Hafatra : c’est ici qui est la conversation entre responsable (texte,image, video, fichier) comme en whatsapp. 

- Fifandraisana : c’est les listes de responsable ou relation extrérieur (partenaire et cooperation) avec les info courte comme adresse,responsabilité,num tel, description (caché par défaut fait en cliquent sur par exemple voire plus ça rend tous les details). 

- Fikirana: 

- compte: modifier 

# - CV  CRUD: 

- Fampafantarana ny tena: anarana*,fanampiny*,adresy*,daty naterahana*,toerana naterahana,button + hanampy(pour plus ajouter autre info) 

- Fifandraisana : finday*,mailaka*,facebook, button + hanampy(pour plus ajouter autre info) 

- Fampafantara ny maha skoto : faritany*,faritra*,fivondronana* 

- Sampana: anarana*,vondrona*,tetikasa,daty nanombohana, daty namaranana, button + hanampy(pour plus ajouter autre info) 

- Hetsika: anarana,andraikitra,famariparitana,daty 

# - deconnection 

# Back office: 

- Creation et suppression d’un utilisateur (email, num tell,entité,responsabilité,photo,nom du compte,mot de passe et confirmation mot de passe) 

- Changement de la responsabilité 

- Creation entité message 

# **II) Régle métier:** 

- **Application mobile** : fonctionnalités accessibles aux responsables ( _Mpiandraikitra_ ). 

- **Back Office** : fonctionnalités accessibles aux administrateurs, sécurité, permissions, gestion des utilisateurs, gestion des archive, gestion des responsabilité, gestion des contact, gestion des conversation. 

# **1. Acteurs et rôles de l'application** 

|**Acteur**|**Acteur**|
|---|---|
|Administrateur|Gère les utilisateurs, les entités, les<br>responsabilités|
|Responsable|Utilise l'application mobile après<br>authentification.|
|Responsable d'entité|Consulte les responsables de son entité et<br>participe aux conversations privées de<br>celle-ci.|
|Responsable général|Participe à la conversation commune<br>destinée à tous les responsables.|



Les deux groupe : Mpanazava, Tily peut avoir quatre entités : Mavo, mantso, mena, menafify. 

# **2. Règles métier de l'application mobile** 

# **Réception:** 

- L'utilisateur doit posséder un compte créé par un administrateur pour accéder à l'application. 

- L'utilisateur doit saisir son adresse e-mail ou son numéro de téléphone et son mot de passe. 

- L'utilisateur ne peut accéder à l'application qu'après vérification de ses identifiants. 

- Un compte supprimé ou désactivé ne peut plus se connecter. 

- Après authentification réussie, l'utilisateur accède à la page d'accueil. 

- L'utilisateur peut se déconnecter à tout moment. 

# **Module mpiandraikitra** 

- L'application affiche la liste des responsables enregistrés. 

- Chaque responsable possède une fiche contenant son nom de compte, sa photo, ses responsabilités, son entité, son groupe (mpanazava, tily). 

- Un responsable peut avoir plusieurs responsabilités 

- Un responsable ne peut pas appartenir dans 2 groupes ou 2 entités 

- L'utilisateur peut consulter le CV détaillé d'un responsable 

- L'utilisateur peut télécharger le CV d'un responsable au format PDF. 

- L'utilisateur peut télécharger tous les CV des responsables au format PDF. 

- Les informations affichées doivent correspondre aux dernières informations enregistrées. 

# **Gestion du curriculum vitae** 

- Chaque responsable peut créer son propre CV 

- Un responsable ne peut modifier que son propre CV. 

- Un responsable ne peut pas modifier le CV d'un autre responsable. 

- Les champs obligatoires doivent être renseignés avant l'enregistrement. 

- Le responsable peut ajouter plusieurs informations supplémentaires grâce au bouton « + ». 

- Le CV doit être consultable par les autres responsables autorisés. 

- Le CV peut être généré et téléchargé au format PDF. 

- L’application génere automatiquement le CV d’un responsable en suivant le model pour les tily et mpanazava. 

# **Gestion des archives** 

- L'application affiche la liste des archives disponibles. 

   - Les archives peuvent être au format PDF ou Word. 

- L'utilisateur peut consulter les documents compatibles directement dans l'application. 

- L'utilisateur peut télécharger une archive. 

- Les documents historiques doivent être accessibles aux générations de responsables autorisées. 

- L'application doit conserver le document original sans modifier son contenu (c’est l’admin administrateur qui gere) 

- Les documents peuvent être organisés par catégorie ou par année. 

# **Messagerie** 

- Chaque entité possède son propre espace de discussion 

- Un responsable ne peut accéder qu'aux conversations des entités auxquelles il appartient. 

- Les messages d'une entité sont privés et ne sont pas visibles par les autres entités. 

- Une conversation générale est accessible à tous les responsables autorisés. 

- Les messages peuvent contenir du texte. 

- Les utilisateurs peuvent envoyer des images, vidéos et fichiers. 

- Chaque message doit être associé à son expéditeur, sa conversation et sa date d'envoi. 

- Un message envoyé doit être visible par les membres autorisés de la conversation. 

- Les utilisateurs peuvent consulter l'historique des messages auxquels ils ont accès. 

- Les fichiers envoyés doivent respecter les formats et tailles autorisés par le système 

- Les messages ne doivent pas être accessibles après révocation des droits d'accès à leur conversation. 

- Si un responsable appartient à plusieurs entités, il peut accéder aux conversations de chacune de ces entités ainsi qu'à la conversation Générale. 

# **Contacts** 

- L'application affiche une liste des contacts disponibles 

- Les contacts peuvent être des responsables internes ou des partenaires extérieurs. 

- Chaque contact possède un nom et une description courte. 

- Les informations détaillées sont masquées par défaut. 

- L'utilisateur clique sur « Voir plus » pour afficher les informations complémentaires. 

- - Les informations détaillées peuvent contenir l'adresse, la responsabilité, le numéro de téléphone et la description. 

- Les contacts sont consultables par les utilisateurs 

# **Paramètres** 

- L'utilisateur peut consulter les informations de son compte. 

   - L'utilisateur peut modifier les informations personnelles autorisées. 

   - L'utilisateur peut modifier son mot de passe après vérification de son ancien mot de passe. 

- L'utilisateur ne peut pas modifier lui-même son entité ou sa responsabilité officielle. 

- L'utilisateur peut se déconnecter de son compte. 

# **Règles métier du Back Office** 

# **Module Gestion des utilisateurs** 

- Seul un administrateur autorisé peut créer un utilisateur. 

- Chaque utilisateur doit disposer d'un compte unique. 

- L'adresse e-mail doit être unique. 

- Le numéro de téléphone doit être unique. 

- Chaque utilisateur doit être associé à au moins une entité. 

- Chaque utilisateur doit avoir au moins une responsabilité. 

- Un utilisateur peut avoir plusieurs responsabilités. 

- L'administrateur peut modifier les informations d'un utilisateur. 

- L'administrateur peut désactiver un utilisateur. 

- Un utilisateur désactivé ne peut plus accéder à l'application. 

- L'administrateur peut consulter la liste de tous les utilisateurs. 

- L'administrateur peut rechercher un utilisateur par nom, entité ou responsabilité. 

# **Module Gestion des responsabilités (Haim-panahy, Fampitaovana, Mpitantsoratra, Mpitahiry vola).** 

- L'administrateur peut créer une responsabilité. 

   - L'administrateur peut supprimer une responsabilité non utilisée. 

- Une responsabilité peut être attribuée à plusieurs responsables. 

   - Un responsable peut avoir plusieurs responsabilités. 

- L'administrateur peut attribuer ou retirer une responsabilité à un responsable. 

- Une modification doit être répercutée dans les informations affichées sur l'application mobile 

# **Module Gestion des entités** 

- L'administrateur peut consulter les quatre entités 

- Une entité peut posséder plusieurs responsables. 

   - Un responsable peut affecté par un entité. 

- Chaque entité doit disposer de son espace de discussion privé. 

# **Module Gestion des conversations** 

- L'administrateur peut créer une conversation. 

- Une conversation peut être associée à une entité 

- Une conversation privée doit être associée à une seule entité et/ou responsabilité. 

- L'administrateur peut consulter la liste des conversations. 

- L'administrateur peut désactiver une conversation. 

# **Module Gestion des archives** 

- L'administrateur peut ajouter une archive. 

- L'administrateur peut modifier les informations descriptives d'une archive. 

- L'administrateur peut supprimer un document. 

- Seuls les formats PDF et Word autorisés peuvent être ajoutés. 

- Chaque archive doit avoir un titre et un fichier associé. 

- Les nouvelles archives publiées deviennent accessibles sur l'application mobile. 

# **Module Gestion des contacts** 

- L'administrateur peut créer un contact. 

   - L'administrateur peut modifier les informations d'un contact. 

- L'administrateur peut supprimer un contact. 

- Un contact peut être un responsable interne ou un partenaire extérieur. 

- Les informations obligatoires doivent être renseignées avant publication. 

   - Les modifications sont automatiquement répercutées dans l'application mobile. 

## Addendum du 17 novembre 2026 — décisions structurantes

L'audit d'implémentation a relevé des règles qui se contredisent ou ne sont pas suffisamment précises pour établir les relations de base de données, les permissions ou les flux d'administration. Elles restent ouvertes jusqu'à validation par le propriétaire produit; aucune règle contradictoire ne doit être choisie implicitement. Le registre des propositions et questions est dans [ADR 0001](./decisions/0001-platform-foundation.md).

Le code actuel ne met en œuvre que la santé de l'API, l'authentification/session, le changement de mot de passe et le CV personnel de l'utilisateur. Le répertoire des responsables, les archives, les contacts, les conversations, les notifications et le backoffice restent à construire. Les données de démonstration locales ne constituent pas des données métier validées.

Le registre ADR 0001 explicite également les décisions encore ouvertes sur la révocation des téléchargements, la compatibilité des migrations avec d'éventuels clients/données existants et les volumes/objectifs de service. Ces propositions techniques ne valent pas validation métier.

