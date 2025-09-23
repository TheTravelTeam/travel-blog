# Intégration dans les pages

## `/me` – MePageComponent
- Bouton “Créer un carnet” → `openMyTravelsForCreation()`
  - Pose `requestCreateModal()` dans `TravelMapStateService`
  - Redirige vers `/travels/users/{userId}`
- Icône “Modifier” sur les cartes (output `edit`) → `openDiaryForEdit(diary.id)`
  - Pose `requestEditDiary(diaryId)`
  - Redirige vers `/travels/users/{userId}`

## `/travels` – MyTravelsPageComponent
- `ngOnInit` (après chargement des carnets)
  - `consumeCreateModalRequest()` → `openCreateModal()`
  - `consumeRequestedEditDiary()` → `openEditModal(diary)`
- `openCreateModal()` → ouvre la modale en mode création.
- `openEditModal(diary)` → ouvre en mode édition, pré‑remplit les champs carnet et positionne `currentDiary`/`currentDiaryId`.
- `onDiaryModalSubmit(payload)` → route selon `isEditMode`:
  - création → `onDiaryCreationSubmit(payload)` (POST `/travel-diaries`, puis POST `/steps`)
  - édition → `onDiaryEditSubmit(payload)` (PUT `/travel-diaries/{id}`)

