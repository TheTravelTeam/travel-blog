# Flux de likes avec les signaux Angular (version simplifiée)

Ce mémo résume le fonctionnement actuel du bouton « J'aime » sur une étape de carnet.

## Chaîne d’exécution
- `DiaryPageComponent` reçoit les étapes depuis `TravelMapStateService.steps`.
- Quand l’utilisateur clique sur le bouton like :
  1. `onStepLike` vérifie que l’utilisateur est authentifié et non bloqué.
  2. Un état optimiste est appliqué via `TravelMapStateService.updateStepLikeState`.
  3. Le service `StepService.updateStepLikes` envoie `PATCH /steps/:id/likes { increment }`.
  4. À la réponse : on applique le compteur définitif ou on revient à la valeur initiale.

## Rôle de `TravelMapStateService`
- Stocke les listes `steps`, `currentDiary`, `visibleDiaries` via des `signal`.
- Normalise les étapes à la réception (tableaux garantis, compteurs numériques, flag `viewerHasLiked`).
- Met à jour un step via `updateStepLikeState(stepId, likes, viewerHasLiked)` qui synchronise `steps` et `currentDiary`.
- Plus de cache dédié par utilisateur : on s’appuie uniquement sur `viewerHasLiked` renvoyé par l’API ou sur l’état optimiste en cours.

## Tests utiles
- `travel-map-state.service.spec.ts` : vérifie la normalisation et la mise à jour des likes.
- `diary-page.component.spec.ts` : couvre le scénario optimiste et les blocages (non connecté, utilisateur désactivé).

Avec cette version, le code reste lisible et facile à reprendre : chaque couche (composant, service d’état, service HTTP) ne fait qu’une chose simple.***
