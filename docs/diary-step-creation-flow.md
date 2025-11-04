# Création d’un carnet et de sa première étape

Ce guide retrace l’intégralité du flux lorsqu’un utilisateur crée un carnet (« travel diary ») puis enchaîne sur la création de sa première étape. On décrit le code côté Angular (UI, services, DTO) et la chaîne côté Spring Boot (contrôleurs, services, validation). L’objectif est de savoir **quelles données partent du formulaire**, **quels endpoints sont sollicités**, **comment le backend persiste les entités** et **où se situent les garde-fous de sécurité**.

---

## 1. Vue d’ensemble

1. L’utilisateur ouvre la modale depuis `MyTravelsPage`.
2. Il renseigne le formulaire carnet (titre, dates, options) et peut envoyer une couverture vers Cloudinary.
3. Il passe au formulaire étape : localisation via la modale, contenu riche, galerie d’images (upload Cloudinary).
4. Au submit :
   - `StepService.addDiary` poste `CreateDiaryDto` sur `POST /travel-diaries`.
   - Une fois le carnet créé, `StepService.addStepToTravel` envoie `CreateStepDto` sur `POST /steps`.
   - Chaque média est persisté via `POST /medias`.
   - Le front recharge le carnet complet (`GET /travel-diaries/{id}`) et met à jour le store `TravelMapStateService`.

---

## 2. Front-end Angular

### 2.1 Point d’entrée UI
- **Fichier** : `src/app/pages/my-travels-page/my-travels-page.component.ts`.
- Méthode `openCreateModal()` affiche `app-create-diary-modal` et charge la liste des thèmes si besoin.
- Permissions : un utilisateur désactivé (`UserService.isCurrentUserDisabled()`) ne peut pas ouvrir/valider la modale (message d’erreur immédiat).

### 2.2 Formulaire carnet (`CreateDiaryModalComponent`)
- **Fichier** : `components/Organisms/create-diary-modal/create-diary-modal.component.ts`.
- `FormGroup` `diaryForm` :
  | Contrôle | Validation | Remarques |
  |----------|------------|-----------|
  | `title` | `required`, `maxLength(150)` | Nettoyé via `decodeHtmlEntities` lors de l’émission |
  | `startDate` | `required` | Date ISO (YYYY-MM-DD) |
  | `coverUrl` | libre | Valeur remplie par upload Cloudinary |
  | `description` | `required`, `minLength(10)` | Contenu du quill editor |
  | `isPrivate`, `canComment` | booléens | Cases à cocher |

- **Upload couverture** :
  - `CreateDiaryModalComponent` réutilise `MediaGridUploaderComponent` en mode différé (`[autoUpload]="false"`).
  - Les fichiers restent en mémoire (aperçu `blob:`) tant que l’utilisateur n’a pas validé la création ou l’édition.
  - Juste avant la soumission finale (`handleStepFormSubmit` côté création, `handleDiarySubmit` côté édition), `ensureCoverUploaded()` envoie les fichiers sur Cloudinary et met à jour `coverUrl` avec le `secureUrl` retourné.

- **Transition étape** :
  - `handleDiarySubmit()` vérifie le formulaire.
  - En mode création, `stage` passe à `'step'` et le composant enfant `CreateStepFormComponent` est réinitialisé.
  - En mode édition, la soumission se fait directement après `ensureCoverUploaded()` sans passer par la phase étape.

### 2.3 Formulaire étape (`CreateStepFormComponent`)
- **Fichier** : `components/Organisms/create-step-form/create-step-form.component.ts`.
- `FormGroup` `stepForm` :
  | Contrôle | Validation | Particularités |
  |----------|------------|----------------|
  | `title` | `required`, `maxLength(150)` | Titre de l’étape |
  | `city`, `country`, `continent` | `required`, `minLength(2)` | Remplis via la modale localisation |
  | `latitude`, `longitude` | `required` | Champs désactivés jusqu’à sélection sur la carte |
  | `description` | `required`, `minLength(10)` | Contenu HTML |
  | `mediaUrl` | libre | Reçoit l’URL du média principal |
  | `startDate`, `endDate` | `required` | ISO string |
  | `themeId` | optionnel | Dropdown (`ItemProps`) |

- **Localisation** :
  - `LocationPickerModalComponent` renvoie `{ lat, lng }`.
  - `GeocodingService.reverseGeocode` peut renseigner ville/pays/continent.

- **Médias** :
  - `MediaGridUploaderComponent` est utilisé en mode différé (`[autoUpload]="false"`). Les fichiers restent en mémoire (aperçu `blob:`) tant que l’utilisateur n’a pas validé le formulaire.
  - Avant d’émettre `submitStep`, `handleSubmit()` invoque `mediaUploader.ensureUploaded()`, ce qui déclenche réellement le téléversement vers Cloudinary (séquentiel) et remplit `publicId`/`secureUrl`.
  - `onMediaItemsChange` met à jour `mediaUrl` (couverture par défaut = premier média).
  - Côté carnet, la couverture suit exactement le même principe via `ensureCoverUploaded()`.

- **Soumission** :
  - `handleSubmit()` construit `StepFormResult` :
    ```ts
    {
      title, description, city, country, continent,
      latitude: number, longitude: number,
      startDate, endDate,
      mediaUrl, media: MediaItem[],
      themeId: number | null
    }
    ```
  - L’événement `submitStep` remonte jusqu’à `CreateDiaryModalComponent`.

### 2.4 Composition du payload final
- `handleStepFormSubmit(result)` assemble :
  - `DiaryFormPayload` (valeurs du `FormGroup` + fallback cover depuis l’étape).
  - `StepFormPayload` (copie directe de `StepFormResult`).
- Emission à `MyTravelsPage` via `submitDiary` :
  ```ts
  { diary: DiaryFormPayload, step: StepFormPayload }
  ```
  - `normalizeDiaryDescription` retire systématiquement les balises HTML générées par l’éditeur (`<p>hello</p>` devient `hello`) avant d’envoyer la description au backend.

### 2.5 Soumission côté page (`onDiaryCreationSubmit`)
1. Vérification des droits (`isCurrentUserDisabled`).
2. Construction du `CreateDiaryDto` :
   ```ts
   {
     title, description,
     latitude: step.latitude,
     longitude: step.longitude,
     media: { fileUrl: cover || '/icon/logo.svg', mediaType: 'PHOTO' },
     user: currentUserId,
     isPrivate, isPublished: true, status: 'IN_PROGRESS',
     canComment,
     startDate,
     steps: []
   }
   ```
3. `StepService.addDiary(payload)` → `POST /travel-diaries`.
4. Une fois le carnet créé :
   - Construction de `CreateStepDto` :
     ```ts
     {
       title, description,
       latitude, longitude,
       travelDiaryId: createdDiary.id,
       startDate, endDate,
       status: 'IN_PROGRESS',
       city, country, continent,
       themeIds: themeId ? [themeId] : []
     }
     ```
   - `StepService.addStepToTravel(createdDiary.id, stepPayload)` → `POST /steps`.
   - Après création de l’étape : `createStepMediaEntries(step.id, mediaItems)` appelle `MediaService.createStepMedia` pour chaque média (`POST /medias`).
   - `stepService.getDiaryWithSteps(createdDiary.id)` recharge le carnet complet.
5. Mise à jour du store :
   - `state.setAllDiaries`, `state.setCurrentDiary`, `state.setSteps`, `state.setOpenedStepId`.
   - Navigation vers `/travels/{diary.id}`.

### 2.6 Tableau récapitulatif des appels HTTP

| Étape | Méthode front | Endpoint | Payload principal |
|-------|---------------|----------|-------------------|
| Upload couverture | `CloudinaryService.uploadImage` | `POST /cloudinary/upload` | multipart (`file`, `folder: 'travel-diaries/covers'`) |
| Création carnet | `StepService.addDiary` | `POST /travel-diaries` | `CreateDiaryDto` |
| Création étape | `StepService.addStepToTravel` | `POST /steps` | `CreateStepDto` |
| Persistance médias | `MediaService.createStepMedia` | `POST /medias` | `{ fileUrl, publicId, mediaType:'PHOTO', stepId, isVisible:true }` |
| Synchronisation finale | `StepService.getDiaryWithSteps` | `GET /travel-diaries/{id}` | — |

---

## 3. Backend Spring Boot

### 3.1 Création de carnet (`POST /travel-diaries`)
- **Contrôleur** : `TravelDiaryController.createTravelDiary`.
  - Sécurisé par `@PreAuthorize("isAuthenticated()")`.
  - Récupère `currentUserId` via `@AuthenticationPrincipal`.
- **DTO** : `CreateTravelDiaryDTO`.
  - Champs principaux : `title`, `description`, `isPrivate`, `isPublished`, `status`, `startDate`, `endDate`, `canComment`, `latitude`, `longitude`, `steps` (liste d’IDs existants), `user`, `media`.
- **Service** : `TravelDiaryService.createTravelDiary`.
  - Map DTO → entité via `TravelDiaryMapper`.
  - Sanitize `title` et `description` (`HtmlSanitizerService`).
  - Résout l’utilisateur propriétaire :
    - `ownerId = dto.user` si fourni, sinon `currentUserId`.
    - Refuse si propriétaire absent ou si l’utilisateur courant tente de créer pour quelqu’un d’autre sans rôle admin (`ForbiddenOperationException`).
  - Médias : si `CreateMediaDTO` présent, instancie `Media` (`fileUrl`, `mediaType`, `isVisible`) et l’attache au carnet.
  - Étapes existantes : si `steps` non vide, charge les entités via `StepRepository.findAllById` et lève une `EntityNotFoundException` si désalignement.
  - Définit les valeurs par défaut :
    - `isPrivate = false` si null.
    - `isPublished = false` si aucune étape.
    - `status` calculé via `resolveDiaryStatus` si absent (basé sur dates et publication).
  - `alignStepsWithDiaryStatus` harmonise le statut de chaque étape.
  - Enregistre via `travelDiaryRepository.save`.

### 3.2 Création d’étape (`POST /steps`)
- **Contrôleur** : `StepController.createStep`.
  - `@PreAuthorize("isAuthenticated()")`.
  - Valide `StepRequestDTO` (`@Valid`).
- **DTO** : `StepRequestDTO`.
  - Contrainte : `title` non blanc (2–50 car.), `latitude/longitude` requis, `city/country/continent` min 2 car., `travelDiaryId` requis.
  - `themeIds` : dédupliqués côté getter (LinkedHashSet) + annotation `@UniqueElements`.
- **Service** : `StepService.createStep`.
  - Map DTO → entité via `StepMapper`.
  - Vérifie l’existence du carnet (`travelDiaryRepository.findById`), sinon `ResourceNotFoundException`.
  - Contrôle d’accès :
    - `isAdmin(currentUserId)` → lit les rôles via `UserRepository`.
    - Sinon, exige que l’utilisateur soit propriétaire du carnet (`ForbiddenOperationException`).
  - Sanitize `title` et `description`.
  - Initialise `likesCount = 0`, timestamps `createdAt/updatedAt`.
  - Résout `Theme` via `resolveThemes(themeIds)` :
    - Filtre null, déduplique, charge via `ThemeRepository.findAllById`.
  - Statut : si `status` absent, calcule via `resolveStepStatus` (basé sur dates et publication du carnet).
  - `stepRepository.save` retourne l’entité persistée.

### 3.3 Persistance des médias (`POST /medias`)
- **Contrôleur** : `MediaController.createMedia`.
  - Pas de restriction d’authent à ce stade (à confirmer selon `SecurityConfig`, mais l’appel se fait juste après création d’étape).
- **DTO** : `CreateMediaDTO`.
  - `fileUrl` obligatoire, `mediaType` obligatoire (`MediaType.PHOTO` dans notre flux).
  - `stepId` ou `travelDiaryId` permet d’associer l’image.
- **Service** : `MediaService.createMedia`.
  - Crée ou met à jour un `Media` en BDD (gestion du `publicId` Cloudinary).
  - Lorsque `stepId` est fourni, le média est relié à l’étape nouvellement créée.

### 3.4 Récupération du carnet (`GET /travel-diaries/{id}`)
- Retourne un `TravelDiaryDTO` complet :
  - `TravelDiaryMapper.toDto` : inclut utilisateur, média de couverture, steps (`StepMapper.toResponseDto`).
  - Chaque `StepResponseDTO` embarque médias, thèmes, commentaires, likes, etc.

---

## 4. Séquence chronologique détaillée

| # | Acteur | Action | Détails |
|---|--------|--------|---------|
| 1 | UI | `Ouvrir la modale` | `openCreateModal` vérifie le statut du compte et charge les thèmes. |
| 2 | UI | `Formulaire carnet` | Saisie des données, upload éventuel de la couverture via Cloudinary. |
| 3 | UI | `Passage à l’étape` | `stage = 'step'`, remise à zéro du formulaire étape. |
| 4 | UI | `Formulaire étape` | Sélection sur la carte, reverse-geocoding, ajout des fichiers (upload Cloudinary déclenché seulement à la validation). |
| 5 | Front | `submitDiary` | `MyTravelsPage` reçoit `{ diary, step }`. |
| 6 | Front → Back | `POST /travel-diaries` | `CreateDiaryDto` (lat/lon issus de l’étape pour positionner le carnet). |
| 7 | Back | `TravelDiaryService.createTravelDiary` | Sanitize, vérifie propriétaire, persiste `TravelDiary` + média couverture. |
| 8 | Front → Back | `POST /steps` | `CreateStepDto` avec `travelDiaryId` du carnet fraîchement créé. |
| 9 | Back | `StepService.createStep` | Vérifie droits owner/admin, sanitize, enregistre `Step`. |
| 10 | Front → Back | `POST /medias` (n fois) | Associe chaque média Cloudinary à l’étape (`stepId`). |
| 11 | Front → Back | `GET /travel-diaries/{id}` | Récupère carnet mis à jour (steps + médias). |
| 12 | Front | `Mise à jour store` | `TravelMapStateService` reçoit le carnet + steps, navigation vers `/travels/{id}`. |

---

## 5. Points d’attention & validations

- **Sanitisation HTML** : `TravelDiaryService` et `StepService` nettoient `title`/`description` (prévention XSS).
- **Contrôles d’accès** :
  - Création carnet : utilisateur connecté obligatoire, création pour autrui uniquement par un admin.
  - Création étape : admin ou propriétaire du carnet.
- **Validations Bean** :
  - `CreateTravelDiaryDTO` repose sur la validation côté entité (`@Valid`).
  - `StepRequestDTO` impose tailles minimales pour ville/pays/continent et la présence des coordonnées.
- **Front** :
  - Les `FormGroup` imposent des validations similaires côté UX (retours visuels).
  - Les dates sont fournies en ISO string, attendues côté backend comme `LocalDate`.
- **Médias** :
  - Les fichiers sont déjà hébergés sur Cloudinary au moment du `POST /medias` (pas de binaire dans la requête).
  - `CreateStepDto.themeIds` est nettoyé côté front (`StepService.cleanStepPayload`) avant l’envoi.
- **Statuts** :
  - Carnet : `status` par défaut calculé selon `resolveDiaryStatus`.
  - Étape : `status` par défaut `IN_PROGRESS` (front) puis recalculé backend si nécessaire.
- **Synchronisation** :
  - Un fetch final (`getDiaryWithSteps`) garantit que les valeurs locales reflètent la BDD (ex. ID du média, likesCount).

---

## 6. Tests conseillés

1. **Création nominale** : remplir les deux formulaires, vérifier la présence du carnet dans `/travels` et des médias.
2. **Couverture manquante** : ne pas uploader d’image → le front prend le premier média d’étape comme cover.
3. **Compte désactivé** : simuler `UserService.isCurrentUserDisabled()` → refus dès l’ouverture/submit.
4. **Rôle non propriétaire** : tenter un `POST /steps` sur un carnet d’autrui sans rôle admin → `403 Forbidden`.
5. **Reverse-geocoding** : basculer offline (échec API) → message `geocodingError` mais soumission possible si coordonnées présentes.

---

Cette fiche complète les documents `cloudinary-upload.md` (détails upload) et `map-component-flow.md` (réutilisation du carnet créé dans la carte). Utilisez-la comme référence rapide lors de tout refactor ou audit fonctionnel autour de la création de carnets/étapes.
