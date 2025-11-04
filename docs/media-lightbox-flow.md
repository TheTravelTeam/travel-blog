# Visionneuse de médias – Page `/travels/:id`

Ce document décrit en détail le fonctionnement de l’ouverture des images dans la page carnet (`DiaryPageComponent`), comment la visionneuse récupère les médias, les signaux utilisés et les méthodes impliquées.

---

## 1. Contexte

Sur `/travels/:id`, le panneau latéral (piloté par `DiaryPageComponent`) liste les étapes du carnet sélectionné. Chaque étape affiche ses médias (images) via des boutons. Lorsque l’utilisateur clique sur un média, une **visionneuse plein écran** s’ouvre, permettant de naviguer entre toutes les images de l’étape.

La logique de cette visionneuse est intégrée directement dans `DiaryPageComponent` :
- aucun composant Angular séparé n’est utilisé,
- l’état (média actif) est maintenu grâce à un `signal` (`activeMediaViewer`),
- le template HTML affiche la visionneuse conditionnellement.

---

## 2. Localisation des éléments

| Élément | Fichier | Rôle |
|---------|---------|------|
| Liste étapes + medias | `diary-page.component.html` (section step cards) | Boutons ouvrant la visionneuse |
| Visionneuse (`media-lightbox`) | `diary-page.component.html` (fin de template) | Contient l’image active, navigation, fermeture |
| Logique TS | `diary-page.component.ts` | Signaux, calculs, handlers (ouvrir, fermer, suivant/précédent) |
| Style CSS | `diary-page.component.scss` (classes `.media-lightbox`) | Overlay, centré, responsive |

---

## 3. Signaux et état

### 3.1 `activeMediaViewer`
- Déclaration : `readonly activeMediaViewer = signal<{ stepId: number; index: number } | null>(null);`
- **StepId** : permet de retrouver la liste de médias pour l’étape.
- **Index** : position du média parmi la liste.

### 3.2 `activeMediaPayload`
- `computed` dérivé de `activeMediaViewer` :
  ```ts
  const selection = this.activeMediaViewer();
  const step = this.state.steps().find(...);
  const medias = this.getStepMedias(step);
  const media = medias[selection.index];
  ```
- Retourne `null` si l’étape/média n’existe plus (par ex. suppression en temps réel).
- Produit `{ medias, index, media }` utilisé dans le template pour afficher l’image, le compteur, et contrôler la navigation.

### 3.3 Autres signaux utiles
- `state.steps()` : liste actuelle des étapes (depuis `TravelMapStateService`).
- `getStepMedias(step)` : méthode utilitaire pour récupérer les médias d’une étape.

---

## 4. Flux d’ouverture/fermeture

### 4.1 Ouverture (`openMediaViewer`)
Bouton `step__media__item` dans HTML :
```html
<button (click)="openMediaViewer(step, $index)"> ... </button>
```

Méthode TS :
```ts
openMediaViewer(step: Step, mediaIndex: number): void {
  const stepId = Number(step.id);
  if (Number.isNaN(stepId)) return;

  this.activeMediaViewer.set({ stepId, index: mediaIndex });
  this.lockBodyScroll();
}
```
- Vérifie que l’ID est numérique.
- Stocke `{ stepId, index }` dans le signal ⇒ la `computed` `activeMediaPayload` se recalculera.
- Appelle `lockBodyScroll()` : 
  - sauvegarde `document.body.style.overflow` dans `bodyOverflowBackup`,
  - force `overflow = 'hidden'` pour empêcher le scroll arrière-plan.

### 4.2 Rendu de la visionneuse
- Le template affiche le bloc :
```html
@if (activeMediaPayload(); as viewer) {
  <div class="media-lightbox" ...>
    <!-- contenu -->
  </div>
}
```
- `viewer` contient `media` (média courant), `medias` (tous les médias de l’étape), `index`.
- L’image affichée utilise `getStepMediaUrl(viewer.media)` pour réappliquer une transformation Cloudinary.
- Si plusieurs médias, des boutons navigation `<` `>` sont visibles.

### 4.3 Fermeture (`closeMediaViewer`)
- Bouton `&times;` ou clic sur l’overlay.
- Méthode :
```ts
closeMediaViewer(): void {
  this.activeMediaViewer.set(null);
  this.unlockBodyScroll();
}
```
- `unlockBodyScroll()` restaure `document.body.style.overflow` à la valeur initiale.

### 4.4 Navigation
- `showPreviousMedia()` et `showNextMedia()` utilisent `activeMediaPayload()` pour connaître la liste.
- Mise à jour via `activeMediaViewer.update(...)`, avec index cyclique.

### 4.5 Clavier (`@HostListener`)
- `handleLightboxKeyboard(event)` capture `Escape`, `ArrowLeft`, `ArrowRight` :
  - Échappe ferme la visionneuse.
  - Flèche gauche/droite naviguent médias (utile pour accessibilité).

---

## 5. Calcul du média courant

`activeMediaPayload` effectue plusieurs vérifications :
1. `selection = activeMediaViewer()` doit exister.
2. `state.steps()` doit contenir l’étape (`find` par `step.id`).
3. `medias = getStepMedias(step)` renvoie un tableau (la méthode normalise `null` en []).
4. `media = medias[selection.index]` doit exister.
5. Si un de ces points échoue ⇒ `null` ⇒ la visionneuse ne s’affiche pas.

**Faille couverte :** évite les erreurs runtime si le carnet est modifié en parallèle (suppression d’étape/média pendant l’affichage).

---

## 6. Ajustement de la taille

La visionneuse n’applique pas de transformation Cloudinary spécifique dans la version actuelle :
- `getStepMediaUrl(media)` applique la transformation existante (destinée aux miniatures). Pour un plein écran, on pourrait passer une transformation `c_limit,w_auto`.
- CSS (`.media-lightbox__image { max-width: 90vw; max-height: 80vh; object-fit: contain; }`) assure que l’image s’adapte à la fenêtre.

Cette approche **limite** le besoin de recalculer une transformation côté client.

---

## 7. Intégration avec le store

- `TravelMapStateService` fournit les étapes et médias (déjà normalisés). `getStepMediaList(step)` renvoie un tableau prêt à être rendu.
- La visionneuse n’ajoute pas de média ; elle consomme uniquement l’état existant.

---

## 8. Scénario complet utilisateur

1. L’utilisateur clique sur un carnet dans `MapComponent` ⇒ `DiaryPageComponent` affiche les étapes.
2. Il clique sur une miniature : `openMediaViewer(step, index)` ⇒ state = `{ stepId, index }`.
3. Le bloc visionneuse s’affiche (overlay). Scroll bloqué.
4. L’utilisateur utilise clics ou clavier pour naviguer ; `activeMediaViewer` change d’index.
5. Il ferme : `closeMediaViewer()` ⇒ overlay retiré, scroll débloqué.

---

## 9. Points d’attention

- `activeMediaViewer` se base sur l’ordre des médias retournés par `getStepMedias(step)` (actuellement listés dans `Step.media`). Toute modification de l’ordre côté backend doit être synchronisée.
- `lockBodyScroll` / `unlockBodyScroll` supposent qu’une seule visionneuse est ouverte à la fois.
- Les transformations Cloudinary peuvent être améliorées (actuellement miniatures). Pour un plein écran optimisé, ajouter un endpoint dédié ou utiliser `CloudinaryService`.

---

## 10. Fichiers liés

- `src/app/pages/world-map-page/diary-page.component.ts`
- `src/app/pages/world-map-page/diary-page.component.html`
- `src/app/pages/world-map-page/diary-page.component.scss`
- `TravelMapStateService` (pour les médias normalisés)
- `MediaService` (persistant lors de la création / suppression de médias)

---

Ce guide doit permettre d’auditer rapidement la visionneuse, d’ajouter des fonctionnalités (ex : zoom, transformations adaptées) ou de corriger des bugs d’affichage.
