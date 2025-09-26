# Media Handling for Travel Diaries

## Contract Overview
- Backend responses expose a single `media` object on each travel diary.
- Step payloads expose a single `media` array; legacy aliases ont été supprimés côté front.

## Frontend Implementation
- `TravelDiary` now only contains `media: Media | null` (old aliases removed).
- `TravelMapStateService` centralises media extraction:
  - `getDiaryCoverUrl(diary)` returns the diary media, or falls back to the first step media.
  - `getStepMediaList(step)` renvoie directement la liste `media` d'une étape.
- Consumers: `MapComponent`, `WorldMapPageComponent`, `MyTravelsPageComponent`, `MePageComponent`.
- Diary creation (`CreateDiaryDto`) posts the new `media` field to keep the contract symmetric.

## Related Files
- `src/app/shared/model/travel-diary.model.ts`
- `src/app/shared/model/step.model.ts`
- `src/app/core/services/travel-map-state.service.ts`
- `src/app/shared/dto/create-diary.dto.ts`
