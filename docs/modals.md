# Modale de création / édition de carnet

Composant: `src/app/components/Organisms/create-diary-modal/create-diary-modal.component.*`

## Inputs
- `isMobile: boolean`
- `isSubmitting: boolean`
- `errorMessage: string | null`
- `availableThemes: ItemProps[]`
- `mode: 'create' | 'edit'` – Définit le comportement et l’UI.
- `initialDiary: { title: string; description: string; coverUrl: string | null } | null`

## Outputs
- `cancel: void`
- `submitDiary: DiaryCreationPayload` – Émis en création et en édition (seule la partie carnet est utilisée en édition).

## Étapes et comportement
- Mode création:
  - Étape 1: Formulaire “Carnet”.
  - Étape 2: Formulaire “Étape”.
  - Soumission → POST `/travel-diaries` puis POST `/steps`.
- Mode édition:
  - Affiche uniquement le formulaire “Carnet”.
  - Bouton “Enregistrer le carnet”.
  - Soumission → PUT `/travel-diaries/{id}` (pas de traitement des steps).

## Champs “Carnet”
- `title` (required), `description` (min 10), `coverUrl`.
- Visibilité et statut: `isPrivate`, `isPublished`, `canComment`, `status: 'IN_PROGRESS' | 'COMPLETED'`.

## Champs “Étape” (création seulement)
- `title`, `city`, `country`, `continent`.
- `startDate`, `endDate`.
- `themeId`, `latitude`, `longitude`, `mediaUrl`.

