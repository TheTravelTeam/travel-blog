# Horizontal Carousel Helper

Ce document décrit le carrousel horizontal utilisé sur la page d'accueil et dans le carnet de voyage. Il explique son fonctionnement, comment l'étendre et le mettre en place dans d'autres vues.

## Fonctionnement

- Le comportement du carrousel est centralisé dans le mixin Sass `horizontal-carousel` (`src/styles/_mixin.scss`).
- Le mixin convertit n'importe quel conteneur en grille à défilement horizontal avec alignement « scroll-snap » pour garder chaque carte bien centrée.
- Les cartes restent accessibles au clavier et au tactile : le mixin active `scroll-behavior: smooth`, désactive la scrollbar visuelle et permet le balayage (`touch-action: pan-x`).
- Les éléments enfants héritent automatiquement d'un `scroll-snap-align` configurable (par défaut `center`).
- Côté template, il suffit d'empiler les éléments (cartes, images, contenus) dans le conteneur : aucun bouton ou script spécifique n'est requis.

## Construction

1. **Extraction du mixin** : le carrousel mobile existant sur la home page utilisait un mixin local. Ce code a été déplacé vers `src/styles/_mixin.scss` pour devenir réutilisable.
2. **Imports partagés** :
   - `src/app/pages/home-page/home-page.component.scss` importe désormais `@use '../../../styles/mixin' as mixins;` et applique `@include mixins.horizontal-carousel(...)` aux listes concernées.
   - `src/app/pages/world-map-page/diary-page.component.scss` importe le même module et applique le mixin aux galeries de médias.
3. **Nettoyage** : le carrousel des étapes n'a plus besoin de boutons personnalisés ni de logique TypeScript (`scrollMediaContainer`). Les attributs de style assurent un rendu uniforme des images avec un ratio 4:3 et un `object-fit: cover`.
4. **Lightbox facultative** : la page `diary` ajoute une visionneuse plein écran ultra légère (ouverture sur clic, flèches clavier, scroll lock). Elle n'est pas requise pour utiliser le mixin, mais montre comment l'enrichir côté template.

## Utilisation

1. **Importer les mixins** dans le fichier SCSS de votre composant :
   ```scss
   @use 'mixin' as mixins; // chemin relatif depuis votre fichier
   ```
2. **Appliquer le mixin** au conteneur qui doit défiler :
   ```scss
   .my-carousel {
     @include mixins.horizontal-carousel(220px, 320px);
   }
   ```
   - `220px` : largeur minimale d'un élément.
   - `320px` : largeur maximale d'un élément.
   - Les paramètres optionnels permettent d'ajuster l'espacement (`$gap`), les marges internes (`$padding`) et l'alignement (`$snap-align`).
3. **Construire le template** :
   ```html
   <div class="my-carousel">
     <app-card *ngFor="let item of items">...</app-card>
   </div>
   ```
   Aucun script n'est nécessaire, le défilement se fait via la roue de souris, les flèches du trackpad ou un swipe.

### Conseils

- Ajustez le ratio (`aspect-ratio`) ou les dimensions des enfants dans le SCSS pour garantir un rendu cohérent.
- Pour masquer la scrollbar sur les navigateurs qui l'affichent encore, le mixin comprend déjà `::-webkit-scrollbar { display: none; }`.
- Si vous devez conserver des boutons de navigation, vous pouvez les remettre dans le template : le conteneur reste compatible avec `scrollBy` pour un contrôle manuel.
- Pour un zoom plein écran, inspirez-vous de la visionneuse des étapes (`diary-page.component.html`). Elle ouvre un overlay avec un simple signal Angular et recycle la même liste de médias.
