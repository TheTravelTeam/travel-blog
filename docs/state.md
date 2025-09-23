# État partagé – TravelMapStateService

Service: `src/app/core/services/travel-map-state.service.ts`

## Signaux principaux
- `steps: Step[]` – Étapes du carnet courant.
- `currentDiary: TravelDiary | null` – Carnet courant.
- `currentDiaryId: number | null` – Id du carnet courant.
- `allDiaries: TravelDiary[]` – Carnets disponibles dans la vue.
- `openedStepId: number | null` – Étape ouverte.
- `openedCommentStepId: number | null` – Étape avec les commentaires ouverts.
- `mapCenterCoords: { lat; lng } | null` – Centre de carte.
- `completedSteps: number` (computed) – Compteur de progression.
- `panelHeight: 'collapsed' | 'expanded' | 'collapsedDiary'` – Hauteur du panneau latéral.

## Ouverture modales (création/édition)
- `shouldOpenCreateModal: boolean` – Flag pour ouvrir la modale de création au chargement de `/travels`.
  - `requestCreateModal()` – Active le flag.
  - `consumeCreateModalRequest(): boolean` – Consomme et réinitialise le flag.
- `requestedEditDiaryId: number | null` – Carnet à éditer après navigation.
  - `requestEditDiary(id: number)` – Définit l’id à éditer.
  - `consumeRequestedEditDiary(): number | null` – Consomme et réinitialise l’id.

## Utilitaires
- `getDiaryCoverUrl(diary)` – Résout l’URL de couverture d’un carnet.
- `getStepMediaList(step)` – Agrège les médias d’une étape.

