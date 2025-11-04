## Flux Cloudinary – du front jusqu’au backend

Ce document détaille pas à pas la manière dont les images sont envoyées vers Cloudinary, comment elles sont persistées dans l’application et quelles sont les classes impliquées côté front comme côté back. Le but est de savoir **qui** fait **quoi**, **quand**, et avec **quelles données**.

---

## 1. Vue d’ensemble

1. **Sélection du fichier dans l’IHM** (`MediaGridUploaderComponent`).
2. **Upload multipart vers notre API** (`POST /cloudinary/upload`).
3. **Le backend signe et transfère le fichier** vers Cloudinary via le SDK Java.
4. **Mise à jour locale du formulaire** (stockage `publicId` + `secureUrl` retournés par le backend).
5. **Soumission du formulaire métier** (création/édition d’étape ou de carnet).
6. **Synchronisation des médias** avec le backend (`POST /medias`, `DELETE /medias/{id}`).
7. **Enregistrement en base** via `MediaService.saveFromCloudinary` (Côté Spring).

Toutes les interactions réseau passent désormais par notre API : le navigateur n’appelle plus Cloudinary directement, ce qui simplifie la CORS policy et protège nos secrets.

---

## 2. Front-end

### 2.1 Composant d’upload : `MediaGridUploaderComponent`
Fichier : `src/app/components/Molecules/media-grid-uploader/media-grid-uploader.component.ts`

**Responsabilités**
- Afficher la collection de médias sélectionnés (miniatures, badge “principal”, suppression).
- Définir le comportement d’upload :
  - `autoUpload=true` (par défaut) : chaque fichier est téléversé dès la sélection. L’élément résultant (`MediaItem`) contient directement `publicId` et `secureUrl`.
  - `autoUpload=false` : le fichier reste côté client sous forme d’URL `blob:`. L’upload n’est déclenché qu’à l’appel explicite de `ensureUploaded()`. Ce mode est utilisé :
    - par `CreateStepFormComponent` (galerie d’étape),
    - par `CreateDiaryModalComponent` (couverture de carnet),
    afin de ne rien envoyer tant que l’utilisateur n’a pas confirmé son formulaire.
- Émettre des événements :
  - `itemsChange` (liste complète),
  - `primaryChange` (média principal, utile pour les couvertures),
  - `uploadingChange` (drapeau utilisé pour bloquer les boutons tant que des transferts sont actifs).

**Structure `MediaItem`**

```ts
interface MediaItem {
  id?: number | null;      // identifiant BDD quand un média existe déjà
  publicId: string | null; // identifiant Cloudinary une fois uploadé
  secureUrl: string;       // URL Cloudinary ou blob local
  file?: File;             // fichier sélectionné (mode différé uniquement)
  uploaded?: boolean;      // true lorsque le fichier est synchronisé
}
```

**Méthodes clefs**

| Méthode | Pourquoi | Comment |
|---------|----------|---------|
| `onPickFiles(event)` | Ajouter les fichiers sélectionnés | Calcule la place disponible (`maxItems`). En mode auto : upload immédiat via `CloudinaryService.uploadImage` puis ajout dans `items`. En mode différé : création d’un `MediaItem` `blob:` sans requête réseau. |
| `ensureUploaded()` | Forcer l’upload des éléments en attente | Parcourt les `MediaItem` avec `file` non vide, transmet le fichier au backend via `CloudinaryService.uploadImage`, remplace l’URL `blob` par `secureUrl`. Lève une erreur en cas d’échec pour permettre au parent de bloquer la soumission. |
| `remove(index)` | Retirer un média | Supprime l’entrée, révoque l’URL locale si nécessaire puis réémet la liste (important pour qu’Angular détecte le changement). |
| `thumb(url)` | Fournir une miniature optimisée | Si l’URL est Cloudinary (`/upload/`), insère la transformation `c_fill,w_160,h_160,q_auto,f_auto`. Les `blob:` sont retournés tels quels. |
| `clear()` | Réinitialiser la grille | Révoque toutes les URLs locales, vide `items`, réinitialise `error` et `uploading`. Utilisé lors des annulations ou des réinitialisations de formulaire. |

> ℹ️ Toutes les opérations sont séquentielles. Pas de `Promise.all`: on privilégie la simplicité et un feedback contrôlé (un échec n’empêche pas les fichiers suivants d’être tentés).

### 2.2 Service d’upload : `CloudinaryService`
Fichier : `src/app/core/services/cloudinary.service.ts`

Méthodes essentielles :

| Méthode | Description | Appel HTTP |
|---------|-------------|------------|
| `uploadImage(file, options?)` | Crée un `FormData` et l’envoie à `/cloudinary/upload`. Le backend signe et transfère ensuite vers Cloudinary. Retourne `{ publicId, secureUrl, resourceType }`. | `POST ${apiUrl}/cloudinary/upload` |

Le service lit `environment.apiUrl`. Les options permettent de forcer le dossier (`folder`) ou de passer un `publicId` prédéfini, utile pour les remplacements.

### 2.3 Formulaire carnet : `CreateDiaryModalComponent`
Fichier : `src/app/components/Organisms/create-diary-modal/create-diary-modal.component.ts`

| Méthode | Rôle | Détails |
|---------|------|---------|
| `onCoverItemsChange(items)` | Synchroniser la grille de couverture | Clone la collection, renseigne `coverItems`, met à jour `coverUrl` avec le premier élément (ou vide si aucun média). |
| `onCoverPrimaryChange(item)` | Gérer la promotion d’une couverture | Positionne `coverUrl` sur la nouvelle image principale (utilisé lorsque l’utilisateur change l’ordre). |
| `ensureCoverUploaded()` | Déclencher les uploads différés | Recherche les `MediaItem` dont `uploaded !== true`, puis pour chacun : appelle `CloudinaryService.uploadImage` (backend → Cloudinary) et remplace l’URL `blob:` (en révoquant l’ancienne). Lève une erreur si le backend ne renvoie pas de payload. |
| `handleDiarySubmit()` | Soumettre le formulaire carnet | - **édition** : appelle `ensureCoverUploaded()` puis émet un `DiaryCreationPayload` sans passer par l’étape. <br> - **création** : vérifie le formulaire puis affiche la seconde étape (formulaire d’étape). |
| `handleStepFormSubmit(result)` | Orchestrer la création carnet + première étape | `ensureCoverUploaded()` → composition du payload carnet → fallback de `coverUrl` via le premier média de l’étape (si besoin) → émission vers la page parente. |
| `clearCoverItems()` | Nettoyer les fichiers temporaires | Révoque les URLs `blob:` non uploadées, vide `coverItems`, appelle `mediaGrid.clear()` pour remettre l’uploader à zéro. |

Cette logique garantit que **rien n’est stocké sur Cloudinary tant que l’utilisateur n’a pas confirmé** la création/édition du carnet.

### 2.4 Formulaire étape : `CreateStepFormComponent`
Fichier : `src/app/components/Organisms/create-step-form/create-step-form.component.ts`

- `mediaUploader` (via `ViewChild`) est le pendant de la couverture pour la galerie d’étape.
- `handleSubmit()` est asynchrone : avant d’émettre `StepFormResult`, il appelle `ensureUploaded()` pour téléverser les fichiers encore en attente. En cas d’échec, le formulaire affiche l’erreur provenant du composant d’upload et la soumission est bloquée.
- `populateFromStep(step)` pré-remplit la galerie en marquant tous les médias existants comme `uploaded = true`, ce qui évite toute interaction avec Cloudinary tant que l’utilisateur n’a pas modifié la galerie.
- `reset()` / `handleCancel()` réinitialisent la grille via `mediaUploader.clear()` afin de libérer les URLs locales.

### 2.5 Persistance métier : `syncStepMedia`
Fichier : `src/app/pages/world-map-page/diary-page.component.ts`

Après soumission du formulaire d’étape (`onStepFormSubmit`) :

1. Création/mise à jour de l’étape via `StepService.addStepToTravel` ou `StepService.updateStep`.
2. Appel de `syncStepMedia(stepId, existingMedia, desiredMedia)` :
   - Compare la liste de médias actuelle (`existingMedia`) avec la liste issue du formulaire (`desiredMedia`, construite à partir des `MediaItem`).
   - Supprime les médias absents (`MediaService.deleteMedia(id)`).
   - Crée les nouveaux médias (`MediaService.createStepMedia({ fileUrl, publicId, stepId, mediaType: 'PHOTO' })`).

`MediaService` (front) se contente de répondre aux endpoints REST génériques (`POST /medias`, `DELETE /medias/{id}`).

> ⚠️ À ce stade, le backend reçoit déjà des fichiers **hébergés** sur Cloudinary. Nous n’envoyons jamais le binaire au serveur.

---

## 3. Backend Spring Boot

### 3.1 Configuration
- `CloudinaryProperties` (`cloudinary.cloud-name`, `api-key`, `api-secret`, `upload-preset`).
- `CloudinaryConfig` : instancie `com.cloudinary.Cloudinary` avec ces propriétés.

### 3.2 Contrôleur : `CloudinaryController`
Fichier : `Travel-blog-API/src/main/java/com/wcs/travel_blog/cloudinary/controller/CloudinaryController.java`

| Endpoint | Description | Méthode métier |
|----------|-------------|----------------|
| `POST /cloudinary/signature` (auth requis) | Génère un payload signé (`timestamp`, `signature`, `apiKey`, `cloudName`, `uploadPreset`). | `CloudinaryService.generateSignature` |
| `POST /cloudinary/media` (auth requis) | Enregistre l’asset Cloudinary (métadonnées). Très similaire à `POST /medias`, utilisé si l’on souhaite un flux 100% dédié Cloudinary. | `MediaService.saveFromCloudinary` |
| `GET /cloudinary/media/{publicId}` | Retourne une URL sécurisée avec transformation optionnelle (`width`, `height`, `crop`, `quality`, `format`). | `CloudinaryService.buildDeliveryUrl` |

### 3.3 Service : `CloudinaryService`

- **`generateSignature(CloudinarySignatureRequest)`**
  - Construit un map `paramsToSign` : `timestamp`, `public_id`, `folder`, `upload_preset`.
  - Utilise `cloudinary.apiSignRequest(...)` avec le `apiSecret`.
  - Retourne `CloudinarySignatureResponse` : `{ timestamp, signature, apiKey, cloudName, uploadPreset }`.

- **`buildDeliveryUrl(publicId, CloudinaryUrlRequest)`**
  - Construit une transformation facultative (`width`, `height`, `crop`, `quality`, `format`).
  - Génère une URL HTTPS via `cloudinary.url().secure(true)...generate(publicId)`.

### 3.4 Persistance : `MediaService.saveFromCloudinary`

- Reçoit `CloudinaryAssetRequest` :
  ```json
  {
    "publicId": "travel-diaries/steps/abc123",
    "secureUrl": "https://res.cloudinary.com/.../image/upload/v...",
    "mediaType": "PHOTO",
    "isVisible": true,
    "stepId": 42,
    "travelDiaryId": null,
    "articleId": null
  }
  ```
- Recherche un `Media` existant par `publicId` (pour supporter les remplacements).
- Met à jour `fileUrl`, `publicId`, `mediaType`, `isVisible`.
- Relie l’entité à `Step`, `TravelDiary` ou `Article` si les IDs sont fournis.
- Enregistre en base (`mediaRepository.save`) et renvoie `MediaDTO`.

> Dans le flux principal des étapes, `syncStepMedia` appelle plutôt `POST /medias`. Cette route (`/cloudinary/media`) reste utile pour des intégrations front plus simples ou pour l’upload d’un asset hors flux “step”.

---

## 4. Séquences détaillées

### 4.1 Étape (galerie d’images)

1. **Sélection** : l’utilisateur choisit ses fichiers → `MediaGridUploaderComponent` crée des `MediaItem` `blob:` (`uploaded=false`).
2. **Validation** : `handleSubmit()` appelle `ensureUploaded()` :
   - **2a.** `ensureUploaded()` boucle sur chaque fichier en attente et appelle `POST /cloudinary/upload` (dossier `travel-diaries/steps`). Le backend signe puis transfère vers Cloudinary.
   - **2b.** À la réponse, l’élément est mis à jour (`publicId`, `secureUrl`), l’URL `blob:` est révoquée.
3. **Émission** : le formulaire renvoie `StepFormResult` avec des URLs définitives.
4. **Back** : `StepController.createStep` ou `updateStep` persiste l’étape (sans binaire).
5. **Sync médias** : `syncStepMedia` compare l’état existant et les souhaits (`desiredMedia`) puis appelle `POST /medias` et `DELETE /medias/{id}` selon les différences.
6. **Back** : `MediaService` crée/supprime les entités `Media` (les fichiers sont déjà sur Cloudinary).
7. **Refresh** : le front recharge le carnet (`GET /travel-diaries/{id}`) pour mettre à jour l’interface.

### 4.2 Carnet (image de couverture)

1. **Sélection** : l’utilisateur choisit une image de couverture → `coverItems` reçoit un `MediaItem` `blob:`.
2. **Validation** :
   - **création** : `handleStepFormSubmit()` (juste avant d’émettre au parent) appelle `ensureCoverUploaded()`.
   - **édition** : `handleDiarySubmit()` appelle la même méthode.
   - `ensureCoverUploaded()` transmet le fichier au backend (`POST /cloudinary/upload`, dossier `travel-diaries/covers`), remplace l’URL `blob:` par le `secureUrl` et réinitialise les drapeaux.
3. **Émission** : le payload carnet contient `coverUrl` (soit l’image uploadée, soit par fallback la première image de l’étape en cas d’absence).
4. **Back** : `TravelDiaryService.createTravelDiary` ou `updateTravelDiary` stocke la couverture via `MediaService` (liaison `travelDiaryId`).

---

## 5. Endpoints & DTO récapitulatifs

### Backend

| Route | DTO entrée | DTO sortie | Description |
|-------|-----------|------------|-------------|
| `POST /cloudinary/upload` | Multipart (`file`, `folder?`, `publicId?`, `resourceType?`) | `CloudinaryUploadResponse` (`publicId`, `secureUrl`, `resourceType`) | Gère l’upload complet (signature + transfert Cloudinary). |
| `POST /cloudinary/signature` | `CloudinarySignatureRequest` (`folder?`, `publicId?`, `uploadPreset?`) | `CloudinarySignatureResponse` | Calcule la signature (support legacy / automatisations). |
| `POST /cloudinary/media` | `CloudinaryAssetRequest` (`publicId`, `secureUrl`, `mediaType?`, `isVisible?`, `stepId?`, etc.) | `MediaDTO` | Persist l’asset Cloudinary. |
| `GET /cloudinary/media/{publicId}` | `CloudinaryUrlRequest` (`width?`, `height?`, `crop?`, `quality?`, `format?`) | `CloudinaryUrlResponse` | Fournit une URL avec transformation. |
| `POST /medias` | `CreateMediaDTO` | `MediaDTO` | Route générique utilisée par `syncStepMedia`. |
| `DELETE /medias/{id}` | — | Texte | Supprime un média. |

### Front

| Fichier | API exposée | Notes |
|---------|-------------|-------|
| `MediaGridUploaderComponent` | `itemsChange`, `primaryChange`, `uploadingChange` | Sélection & état UI. |
| `CloudinaryService` | `uploadImage` | Envoie un `FormData` au backend qui se charge de Cloudinary. |
| `CreateDiaryModalComponent` | `ensureCoverUploaded`, `handleDiarySubmit`, `handleStepFormSubmit` | Couverture en mode différé, enchaînement carnet + étape. |
| `CreateStepFormComponent` | `handleSubmit`, `onMediaItemsChange`, `reset` | Galerie d’étape et upload différé des médias. |
| `DiaryPageComponent` | `onStepFormSubmit`, `syncStepMedia` | Orchestration globale (steps + médias). |
| `MediaService` | `createMedia`, `deleteMedia` | Persistance via API REST. |

---

## 6. À retenir

- Le fichier transite désormais **via notre backend** : le front n’appelle plus Cloudinary directement. En mode différé, l’envoi n’a lieu qu’au moment où l’utilisateur confirme son action.
- Le backend ne manipule que des **identifiants** Cloudinary (`publicId`) et des **URL sécurisées** (`secureUrl`).
- Les signatures Cloudinary restent disponibles côté backend pour les intégrations spécifiques, mais le flux standard n’en a plus besoin côté front.
- La persistance en BDD se fait soit via `POST /medias`, soit via `POST /cloudinary/media` selon le flux utilisé.
- En cas d’échec d’upload, le composant front reste responsable d’afficher le message et de ne pas soumettre le média.

Pour aller plus loin, consulter également :
- `Travel-blog-API/docs/cloudinary-upload-flow.md` (référence côté back),
- `Travel-blog-API/src/main/resources/static/openapi.yaml` (contrat complet API),
- `Travel-blog-API/src/main/java/com/wcs/travel_blog/cloudinary` (implémentation Spring).
