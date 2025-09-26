# Cloudinary Upload Pipeline

This document explains how the Angular front-end handles media uploads for steps and travel diaries. It covers the user experience, the services involved, the API calls that are issued, and the conventions that keep Cloudinary assets consistent across the application.

## Overview

The upload flow follows these phases:

1. **User selection** – the user drops one or more files in the `MediaGridUploaderComponent`.
2. **Signature retrieval** – the front-end asks the back-end for a signed payload (no Cloudinary secrets on the client).
3. **Cloudinary upload** – each file is posted directly to Cloudinary with the signed payload.
4. **UI update** – the newly created `publicId` and `secureUrl` are appended to the grid and to the bound Angular form models.
5. **Business persistence** – when the form is submitted, the step payload is created and `MediaService` stores the Cloudinary metadata in the back-end so that steps and diaries reference the right media records.

The diagram below illustrates the sequence:

```
[User]
  │ selects files
  ▼
MediaGridUploaderComponent
  │ emits upload request(s)
  ▼
CloudinaryService.getUploadSignature()  ──▶  Back-end `/cloudinary/signature`
  │ receives signature
  ▼
CloudinaryService.uploadImage()         ──▶  Cloudinary REST API
  │ receives `{ publicId, secureUrl }`
  ▼
MediaGrid updates form state
  │ emits `itemsChange`
  ▼
CreateStepForm / CreateDiaryModal integrate URLs in submission payloads
  │
  ▼
DiaryPageComponent persists step and media through StepService & MediaService
```

## Front-end components

### `MediaGridUploaderComponent`

Path: `src/app/components/Molecules/media-grid-uploader/media-grid-uploader.component.ts`

- Accepts an initial list of `MediaItem` objects and renders the corresponding thumbnails.
- When the user selects new files, the component uploads them sequentially to Cloudinary using `CloudinaryService.uploadImage`.
- Emits two outputs:
  - `itemsChange` → full array of uploaded assets (used to feed Angular forms).
  - `primaryChange` → first item in the collection, allowing parent components to pick a cover image.
- Limits uploads through the `maxItems` input and supports folder scoping via the `folder` input (`travel-diaries/steps` by default).
- Provides the `thumb(url: string)` helper to request 160×160 thumbnails (`c_fill,w_160,h_160,q_auto,f_auto`).

### Step creation forms

1. **`CreateStepFormComponent`** (`src/app/components/Organisms/create-step-form/create-step-form.component.ts`)
   - Hosts the grid uploader.
   - Synchronises the reactive form with the primary media URL.
   - Includes the media list (`media` property) in the emitted `StepFormResult` to keep the rich payload alongside other form values.

2. **`CreateDiaryModalComponent`** (`src/app/components/Organisms/create-diary-modal/create-diary-modal.component.ts`)
   - Reuses the same uploader for the first step of a new diary.
   - Persists the uploaded items in `stepMediaItems` and appends them to the final `StepFormPayload` when the wizard is submitted.

Both components reset the grid items when the user cancels or changes stage to avoid replaying old uploads.

### `DiaryPageComponent`

Path: `src/app/pages/world-map-page/diary-page.component.ts`

- Receives `StepFormResult` from the step form and invokes `StepService` to create or update the step data.
- Calls `MediaService.createStepMedia` for each newly uploaded file so that the back-end stores Cloudinary references.
- Uses `getStepMediaUrl` and `injectCloudinaryTransform` to deliver responsive assets with `c_limit,w_auto:100:1000` when rendering step cards.
- Sets the `<img>` attributes `sizes="100vw"`, `loading="lazy"`, and `decoding="async"` so browsers with Client Hints download the best width.

## Services and DTOs

### `CloudinaryService`

Path: `src/app/core/services/cloudinary.service.ts`

- `getUploadSignature(payload)` posts to `${environment.apiUrl}/cloudinary/signature` with optional overrides (`folder`, `publicId`, `resourceType`).
- `uploadImage(file, options)` uses the signature to post the file directly to `https://api.cloudinary.com/v1_1/<cloud>/<resourceType>/upload`.
- Emits a simplified `{ publicId, secureUrl }` object consumed by UI components.
- The service is fully documented with JSDoc comments for quick reference of parameters and return types.

### `MediaService`

Path: `src/app/core/services/media.service.ts`

- Provides `createStepMedia(payload)` to persist Cloudinary metadata in the application's back-end.
- Used after step creation/update to register each asset (ensures step cards can display Cloudinary URLs later).

### `StepService` and DTOs

- `CreateStepDto` (`src/app/shared/dto/create-step.dto.ts`) represents the payload sent to the back-end for step creation.
- `MediaPayload` and `StepFormResult` (`src/app/shared/model/stepFormResult.model.ts`) capture the list of uploaded media at the form level.
- `DiaryPageComponent` merges these pieces to orchestrate full persistence of steps and their media.

## Delivery transformations

- Step cards insert a Cloudinary transformation when the asset URL contains `/upload/` and no `w_auto` transformation yet.
- The transformation `c_limit,w_auto:100:1000` ensures images respect the container constraints while leveraging Client Hints for automatic width selection. A fallback width of 1000px is used by browsers that do not send hints.
- Thumbnails rendered by `MediaGridUploaderComponent` use a dedicated 160×160 crop for fast previews.

## Error handling and UX

- Uploads are sequential; if a file fails, the component records the error (e.g., `Échec d'upload pour foo.jpg`) and continues with the remaining files.
- The UI exposes a spinner through the `uploading` boolean and disables repeated selections until uploads finish.
- Removing a media item automatically promotes the next one as the primary image and informs consumers via `primaryChange`.

## Extensibility guidelines

- To change the destination folder, set the `folder` input on `MediaGridUploaderComponent`.
- To support non-image resources, pass `resourceType` with the desired value; the Cloudinary service forwards it to the signature endpoint and upload call.
- To customise responsive behaviour, update `injectCloudinaryTransform` so that a different transformation string is injected (e.g., additional height, aspect ratio or lazy-loading hints).
- When removing media server-side is required, add a call to the dedicated back-end endpoint (not currently implemented) whenever `remove()` is triggered.

## Testing tips

- During unit tests, mock `CloudinaryService` to return a resolved observable with a deterministic URL; no network call is required.
- When mocking the back-end (`JSON Server`), ensure uploaded assets are added to `db.json` under the appropriate diary/step to reflect the real persistence cycle.
- Verify that `getStepMediaUrl` leaves already transformed URLs untouched to avoid duplication while rendering existing data.

For questions or enhancements, start with the JSDoc comments on `CloudinaryService` or the `MediaGridUploaderComponent`, then follow the service calls outlined above.
