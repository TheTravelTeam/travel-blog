# Flux des likes avec signaux Angular

Ce document décrit comment l'application gère le bouton « J'aime » d'une étape de carnet en s'appuyant sur les signaux (`@angular/core`). L'objectif est de garder l'UI synchrone avec le backend tout en empêchant qu'un utilisateur récupère les préférences d'un autre après un changement de session.

## Vue d'ensemble

1. **`DiaryPageComponent`** expose les étapes via `TravelMapStateService` et écoute l'identifiant du visiteur courant.
2. Lorsqu'un utilisateur clique sur `app-button[type="like"]`, la méthode `handleButtonClick` délègue à `onStepLike(step)`.
3. `onStepLike` contrôle l'état d'authentification, l'éventuel blocage du compte, puis construit un état optimiste (incrément ou décrément). Les signaux concernés :
   - `stepLikePending` : dictionnaire `{ [stepId]: boolean }` marquant le chargement du PATCH.
   - `stepLikeErrors` : dictionnaire des messages d'erreur (authentification, compte désactivé, échec réseau).
4. L'état optimiste est confié à `TravelMapStateService.updateStepLikeState`, qui met à jour les structures partagées (`steps`, `currentDiary`) via signaux et mémorise la préférence locale.
5. Une requête `PATCH /steps/:id/likes` est envoyée via `StepService`. À la réponse :
   - Succès → `updateStepLikeState` est relancé avec la valeur finale renvoyée par l'API.
   - Échec → `updateStepLikeState` est rappelé avec les valeurs de départ pour restaurer l'UI.

## Gestion multi-compte

- `DiaryPageComponent` écoute `currentViewerId` et invoque `TravelMapStateService.setViewerLikeOwner(viewerId)` dès qu'il change. Le service purge alors ses caches (`likedStepIds`) et remet `viewerHasLiked` à `false` sur les structures en mémoire.
- Lorsqu'un backend fournit `viewerHasLiked` (cas d'une liste d'étapes où l'API sait déjà si l'utilisateur a aimé), le service applique cette préférence en mémoire, sans repasser par un stockage persistant.

## Signaux clés et transitions

| Signal | Portée | Rôle |
| --- | --- | --- |
| `TravelMapStateService.steps` | application | Source principale des étapes affichées dans la page et d'autres vues reliant le service. |
| `TravelMapStateService.currentDiary` | application | Contient les étapes et métadonnées du carnet actif, mis à jour en parallèle de `steps`. |
| `TravelMapStateService.likedStepIds` | service | Ensemble en mémoire des identifiants aimés par le compte courant ; remis à zéro quand le visiteur change. |
| `DiaryPageComponent.stepLikePending` | composant | Map locale pour désactiver le bouton le temps de la réponse HTTP. |
| `DiaryPageComponent.stepLikeErrors` | composant | Map locale des messages visibles sous le bouton. |

## Séquence détaillée

1. **Initialisation des données**
   - `TravelMapStateService.setSteps` normalise les étapes : calcule `likes`, `likesCount`, applique `viewerHasLiked` et enregistre la préférence via `applyViewerLikePreference`.
2. **Changement d'utilisateur**
   - `setViewerLikeOwner` compare l'identifiant précédent avec le nouveau. Si différent :
     - Efface `likedStepIds`.
     - Réinitialise `viewerHasLiked` à `false` sur `steps` et `currentDiary`.
3. **Clic sur le bouton like**
   - `onStepLike` vérifie `isAuthenticated()` et `isViewerDisabled()`.
   - Détermine `increment` à partir de `step.viewerHasLiked` ou, à défaut, du cache `hasViewerLikedStep(stepId)`.
   - Actualise immédiatement le compteur via `updateStepLikeState(stepId, optimisticLikes, increment)`.
   - Envoie la requête PATCH.
4. **Réception de la réponse**
   - `resolveLikesFromResponse` extrait `likesCount` ou `likes`.
   - `updateStepLikeState` rejoue l'état final, puis `applyViewerLikePreference` mémorise la préférence en mémoire.

## Erreurs utilisateur

- **Non connecté** : `setStepLikeError(stepId, 'Connectez-vous pour aimer une étape.')` et aucune requête n'est envoyée.
- **Compte désactivé** : message analogue et blocage client.
- **Erreur réseau** : l'état optimiste est inversé, `stepLikePending` retombe à `false`, aucun message n'est affiché (mais on pourrait en ajouter si nécessaire).

## Points d'attention

- Aucun stockage persistant (localStorage) n'est utilisé : le backend reste la source de vérité sur le fait qu'un utilisateur aime une étape donnée.
- Lorsqu'un lot d'étapes arrive sans `viewerHasLiked`, la première interaction repose sur `likedStepIds`; celui-ci étant vidé lors d'un changement de compte, la première pression génère toujours un incrément.
- Les tests unitaires clés :
  - `TravelMapStateService` → vérifie la synchronisation du flag et le reset sur changement de viewer.
  - `DiaryPageComponent` → contrôle les blocages d'accès et le scénario optimiste.

---

Pour approfondir, consulter :
- `src/app/pages/world-map-page/diary-page.component.ts`
- `src/app/core/services/travel-map-state.service.ts`
- Les spécifications associées dans `src/app/pages/world-map-page/diary-page.component.spec.ts` et `src/app/core/services/travel-map-state.service.spec.ts`.
