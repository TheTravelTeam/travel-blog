# API consommées

## Création d’un carnet
- POST `/travel-diaries` avec `CreateDiaryDto`
  - Champs utilisés: `title`, `description`, `latitude`, `longitude`, `media{fileUrl, mediaType}`, `user`, `isPrivate`, `isPublished`, `status`, `canComment`.

## Création d’une étape
- POST `/steps` avec `CreateStepDto`
  - Champs utilisés: `title`, `description?`, `latitude`, `longitude`, `travelDiaryId`, `startDate?`, `endDate?`, `status?`, `city?`, `country?`, `continent?`.

## Mise à jour d’un carnet
- PUT `/travel-diaries/{id}` avec `UpdateTravelDiaryDTO`
  - Champs envoyés (scalaires uniquement): `title?`, `description?`, `isPrivate?`, `isPublished?`, `status?`, `canComment?`.
  - Non envoyés: `steps`, `media`, `user`, `latitude`, `longitude` (pas d’impact par défaut côté back).

Notes backend
- La mise à jour “tri‑état” côté back doit:
  - Ne pas toucher aux `steps` si la liste est `null`. Remplacer seulement si la liste est fournie (y compris vide pour effacement explicite).
  - Ne pas toucher au `media` si `media` est `null`. Mettre à jour seulement si un id est fourni.

