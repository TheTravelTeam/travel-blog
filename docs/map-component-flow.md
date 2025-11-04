# MapComponent – Flux complet carnets & étapes

Document de référence pour comprendre comment `MapComponent` (Angular) charge et affiche les carnets / étapes, comment il interagit avec les services et quelles méthodes interviennent à chaque moment.

---

## 1. Rôle général

`MapComponent` affiche une carte Leaflet, place :
- des **marqueurs de carnets** (diaries) lorsqu’aucun carnet n’est sélectionné, 
- des **marqueurs d’étapes** et un tracé lorsque l’utilisateur sélectionne un carnet.

Le composant est autonome : il écoute l’état partagé `TravelMapStateService`, charge les données via `StepService`, et émet des événements (`mapInitialized`, `diarySelected`, `stepSelected`, `renitializedDiaries`).

---

## 2. Structure du composant

### 2.1 Dépendances
- **Leaflet** (`L.map`, `L.marker`, `L.layerGroup`, `L.polyline`).
- **Services injectés** :
  - `TravelMapStateService` (store partagé : carnets visibles, carnet courant, étape ouverte…)
  - `StepService` (appel API : `/travel-diaries`, `/travel-diaries/{id}`)
  - `AuthService` + `UserService` (vérification of user id / role pour l’accessibilité)
  - `BreakpointService` (orientation mobile ↔ desktop)
  - `Router`, `Location` (navigation)
  - `EnvironmentInjector` pour créer des marqueurs Angular (`AvatarComponent`).

### 2.2 Inputs / Outputs
| Input | Description |
|-------|-------------|
| `viewMode` | flag pour savoir si la carte doit afficher la liste des carnets au chargement |
| `zoomLevel`, `centerLat`, `centerLng` | configuration initiale de la carte |
| `centerOnStep` | lat/lng à rejoindre (après un clic dans le panneau) |

| Output | Description |
|--------|------------|
| `mapInitialized` | émis après chargement des carnets visibles `{ diaries }` |
| `diarySelected` | émis après chargement d’un carnet `{ diary, steps }` |
| `stepSelected` | émis lorsqu’un marqueur d’étape est cliqué `{ step, stepIndex }` |
| `renitializedDiaries` | émis quand `backToDiaries` remet la carte en mode “liste carnets” |

### 2.3 Effets Rx (signals Angular)
- `effect #1` : si `state.currentDiaryId` change, recharge les étapes.
- `effect #2` : si `state.visibleDiaries` change, rerend les marqueurs.


---

## 3. Rendu initial

1. `ngAfterViewInit` invoque `initMap` :
   - Crée `L.map`, applique `tileLayer` (atlas Esri), instancie `LayerGroup` pour les marqueurs.
   - Appelle `tryLocateUser` (centrage opc sur la géolocalisation navigateur).
2. `viewMode === true` et `state.currentDiaryId() === null` ⇒ `loadAllDiaries()` :
   - `StepService.getAllDiaries()` (GET `/travel-diaries`).
   - Filtre sur `TravelMapStateService.isDiaryAccessible(...)` (rôles, owner status).
   - `state.setAllDiaries` + `state.setVisibleDiaries` + `renderDiaryMarkers`.
   - EMET `mapInitialized` avec la liste accessible.

`MapComponent` ne stocke pas les carnets localement : le store `TravelMapStateService` reste source de vérité.

---

## 4. Marqueurs de carnets (`renderDiaryMarkers`)

1. Vide la `LayerGroup` (`clearLayers`).
2. Pour chaque carnet :
   - Récupère l’avatar (`state.getDiaryCoverUrl` fallback `/icon/logo.svg`).
   - Construit un HTML simple (<img>) pour `L.divIcon` (50x50).
   - Crée un `L.marker([latitude, longitude], { icon })`.
   - Sur clic :
     - `currentDiaryId = diary.id` + `state.setCurrentDiaryId(diary.id)`.
     - `router.navigate(['/travels', diary.id])` (pour synchroniser route).
     - `loadStepsForCurrentDiary()` chargera les étapes.

> 📝 Le store `TravelMapStateService` agit alors sur les panneaux/tabs (cf. état `panelHeight`).

---

## 5. Chargement des étapes (`loadStepsForCurrentDiary`)

1. Appelle `StepService.getDiaryWithSteps(diaryId)` (GET `/travel-diaries/{id}`).
2. Vérifie l’accessibilité via `state.isDiaryAccessible` (admin, owner, user enabled).
3. Nettoie les marqueurs existants (`clearMapLayers` : sup prime `L.Marker` et `L.Polyline`).
4. Émet `diarySelected({ diary, steps })`.
5. Remet `state.setCurrentDiary(diary)`.
6. Parcourt chaque étape :
   - Utilise `state.getStepMediaList(step)` pour récupérer les médias.
   - Crée un marqueur via `addMarkerWithComponent` (voir section 6).
   - Enregistre un handler `marker.on('click')` qui émet `stepSelected` (pour mettre à jour le panneau).
7. Dessine la polyline (`L.polyline`) et centre la carte sur la première étape (`map.flyTo`).

---

## 6. Marqueurs d’étapes (`addMarkerWithComponent`)

- Crée dynamiquement un composant Angular `AvatarComponent` dans un `div` (via `ViewContainerRef.createComponent`).
- Si un média existe (`medias[0]`), passe `picture`, sinon `label` (initiale auteur).
- `AvatarComponent` est détruit (`compRef.destroy()`) après avoir extrait son HTML.
- `L.marker` affiche cette icône personnalisée.

> ⚠️ La création est temporaire (composant détruit). Le HTML final est statique.

---

## 7. Retour à la vue carnets (`backToDiaries`)

- Appelé depuis le bouton template (`map.component.html`).
- Paramètres (`skipNavigation`, `skipStateReset`, `skipGlobalReload`) permettent de conserver l’API existante.
- Actions principales :
  1. `state.clearCurrentDiarySelection({ preserveVisibleDiaries: true })`.
  2. `state.panelHeight.set('collapsed')`.
  3. reset `currentDiaryId`, `viewMode = true`.
  4. Vide `LayerGroup` + supprime markers/polyline.
  5. Réaffiche les carnets déjà visibles (sinon relance `loadAllDiaries`).
  6. Recentre la carte via `tryLocateUser`.
  7. Émet `renitializedDiaries` sauf si `skipStateReset`.

---

## 8. Template HTML (`map.component.html`)

```html
<div class="container">
  <div class="map-container">
    @if (state.currentDiaryId() && !isMobile()) {
      <button (click)="backToDiaries()" class="back-button">⬅</button>
    }
    <div id="map"></div>
  </div>
</div>
<ng-template #markerContainer></ng-template>
```

- Bouton retour uniquement si un carnet est sélectionné (`state.currentDiaryId`) et device non mobile.
- `<div id="map">` : conteneur Leaflet (CSS gère dimension).
- `<ng-template #markerContainer>` : support pour les composants dynamiques (avatars).

---

## 9. Interactions avec `TravelMapStateService`

| Méthode | Description |
|---------|-------------|
| `state.visibleDiaries()` | Liste filtrée (setAllDiaries + setVisibleDiaries) |
| `state.currentDiaryId()` | ID du carnet sélectionné (effet recharge steps) |
| `state.getDiaryCoverUrl(diary)` | Cover URL (avatar marker) |
| `state.getStepMediaList(step)` | Liste des médias de l’étape (grâce à store) |
| `state.isDiaryAccessible(diary, { viewerId, viewerIsAdmin })` | Filtrage carnets accessibles |
| `state.panelHeight` | Gère affichage panneau droit (collapsed / expanded) |

Le composant ne modifie jamais le store en dehors des setters (`setCurrentDiaryId`, `setCurrentDiary`, `clearCurrentDiarySelection`…).

---

## 10. Cycle complet utilisateur

1. **Arrivée sur `/travels`** : `MapComponent` charge tous les carnets accessibles et les affiche.
2. **Clique sur un marqueur** :
   - `currentDiaryId` mis à jour → `loadStepsForCurrentDiary` → markers étapes + polyline + événement `diarySelected`.
   - Panneau latéral (piloté par `TravelMapStateService`) affiche les détails du carnet.
3. **Clique sur un marqueur d’étape** :
   - `stepSelected` émis → parent peut centrer le panneau sur l’étape correspondante (`setOpenedStepId`).
4. **Clique sur « retour »** :
   - `backToDiaries()` remet la carte en vue carnets, émet `renitializedDiaries`.

---

## 11. Fichiers associés
- `map.component.ts` – logique principale Leaflet + interactions.
- `map.component.html` – rendu minimal (carte + bouton retour).
- `map.component.scss` – styles (taille carte, custom marker, bouton).
- `TravelMapStateService` – state partagé (voir `docs/state.md`).
- `StepService` – API HTTP (GET `/travel-diaries`, `/travel-diaries/{id}`…).
- `DiaryPageComponent` – consomme `MapComponent` (pour synchroniser panneau étapes, backToDiaries, etc.).

---

## 12. Points d’attention
- `renderDiaryMarkers` redessine la couche à chaque changement `visibleDiaries` (effet). S’assurer que la liste ne change pas inutilement.
- `loadStepsForCurrentDiary` efface tous les `Marker`/`Polyline`, puis recrée markers carnets/étapes ; à optimiser si besoin.
- `tryLocateUser` dépend de l’API `navigator.geolocation`; en cas de refus, la carte reste centrée sur `(centerLat, centerLng)`.
- Les marqueurs d’étapes utilisent `AvatarComponent` pour l’UI (nécessite le `<ng-template>` dans le template).
- La navigation `router.navigate(['/travels', diary.id])` implique que d’autres composants réagissent à la route (`DiaryPageComponent`).

---

## 13. Scénarios test
- [ ] Arrivée sur `/travels` : markers carnets visibles, `mapInitialized` émis.
- [ ] Clique carnet accessible → markers étape + polyline + `diarySelected` ≠ null.
- [ ] Clique marqueur étape → `stepSelected` (composant parent met à jour panneau).
- [ ] Bouton retour → markers carnets, `renitializedDiaries` émis.
- [ ] Bascule mobile (`BreakpointService` → `isMobile`) : bouton retour absent.
- [ ] Carnets non accesibles (owner disabled, status disabled) filtrés.

Ce guide sert de référence rapide pour nouveaux développeurs ou audits métier.
