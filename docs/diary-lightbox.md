# Visionneuse Plein Écran (Diary)

Ce document détaille le fonctionnement du zoom photo introduit dans `diary-page`. Il décrit l’architecture, les interactions utilisateur et les étapes à suivre pour l’étendre ou le réutiliser ailleurs.

## Objectifs

- Afficher une photo d’étape en plein écran via un simple clic.
- Permettre la navigation au clavier (← / → / Échap) et à la souris.
- Empêcher le scroll du body pendant l’affichage, puis le restaurer automatiquement.
- Réutiliser la même liste de médias que celle du carrousel sans appels réseau supplémentaires.

## Structure générale

| Élément | Fichier | Rôle |
| --- | --- | --- |
| Signal `activeMediaViewer` | `diary-page.component.ts` | Stocke `stepId` + `index` du média actif. |
| Calcul `activeMediaPayload` | `diary-page.component.ts` | Résout la liste des médias + l’élément courant à partir du signal. |
| Méthodes `open/close/showNext/showPrevious` | `diary-page.component.ts` | Pilotent l’ouverture, la fermeture et la navigation. |
| HostListener `handleLightboxKeyboard` | `diary-page.component.ts` | Gère Échap / flèche gauche / flèche droite. |
| Méthodes `lockBodyScroll` / `unlockBodyScroll` | `diary-page.component.ts` | Bloque puis restaure le scroll global. |
| Template `media-lightbox` | `diary-page.component.html` | Overlay semi-transparent + contenu centré. |
| Styles `.media-lightbox*` | `diary-page.component.scss` | Mise en page, transitions, responsive. |

## Cycle de vie utilisateur

1. **Clic sur vignette** : le bouton `step__media__item` appelle `openMediaViewer(step, index)`, qui enregistre l’étape + l’index et bloque le scroll du body.
2. **Rendu** : le template affiche `media-lightbox` quand `activeMediaPayload()` renvoie une valeur.
3. **Navigation** :
   - Boutons `‹` et `›` appellent `showPreviousMedia()` et `showNextMedia()`.
   - Le clavier déclenche `handleLightboxKeyboard()` (Échap ferme, flèches changent de photo).
4. **Fermeture** : clic sur la croix, clic en dehors ou Échap → `closeMediaViewer()` → signal remis à `null` + scroll restauré.

## Points clés d’implémentation

- **Pas d’état dupliqué** : on calcule tout depuis la source de vérité `TravelMapStateService` (liste des steps/médias).
- **Boucle circulaire** : `showPreviousMedia` et `showNextMedia` reviennent au dernier/premier média quand on dépasse les bornes.
- **Accessibilité** : boutons focusables, `aria-modal="true"`, labels explicites, raccourcis clavier.
- **Verrouillage du scroll** : on mémorise `document.body.style.overflow` pour le rétablir exactement comme avant.
- **Responsive** : `.media-lightbox__nav` et `.media-lightbox__close` utilisent `clamp()` pour s’adapter du mobile au desktop.

## Reproduire la fonctionnalité ailleurs

1. **Copier l’état** : ajouter un signal `activeMediaViewer` + le computed `activeMediaPayload` dans le composant cible.
2. **Réutiliser les méthodes** : importer/adapter `openMediaViewer`, `closeMediaViewer`, `showNextMedia`, `showPreviousMedia`, `handleLightboxKeyboard`, `lockBodyScroll`, `unlockBodyScroll`.
3. **Brancher les vignettes** : entourer les `<img>` du carrousel par un `<button>` qui appelle `openMediaViewer` avec l’index correspondant.
4. **Ajouter le template overlay** : reprendre le bloc `@if (activeMediaPayload(); as viewer)` ou le convertir en `<ng-container>` selon l’API utilisée.
5. **Inclure les styles** : copier les règles `.media-lightbox*` ou les factoriser dans un SCSS partagé.
6. **Tester** : vérifier navigation clavier, fermeture par clic extérieur, restauration du scroll et comportement responsive.

## Personnalisation

- **Affichage d’un titre ou d’une légende** : ajouter un bloc `<figcaption>` sous l’image dans la lightbox et alimenter la donnée via `viewer.media`.
- **Téléchargement** : ajouter un bouton supplémentaire à côté des flèches qui ouvre `viewer.media.fileUrl` dans un nouvel onglet.
- **Animations** : jouer sur `opacity` / `transform` dans `.media-lightbox__image` pour créer un fondu lors des transitions.
- **Limiter la navigation** : retirer le wrap-around en remplaçant les calculs de `nextIndex` par des bornes (`Math.max`/`Math.min`).

## Scénarios particuliers couverts

- Si la liste des médias est modifiée (suppression) alors que la lightbox est ouverte, `activeMediaPayload` renverra `null`; le template s’éteint automatiquement.
- Si l’étape ne possède plus de médias, la navigation est désactivée et l’overlay se ferme au prochain clic.
- Les événements clavier sont ignorés tant que la visionneuse n’est pas active pour éviter de perturber la navigation globale.

## Tests conseillés

- **Desktop** : clic vignette → ouverture, navigation flèches souris + clavier, Échap pour fermer.
- **Mobile** : vérifier l’espacement des boutons, fermeture par tap extérieur.
- **Accessibilité** : `Tab` vers les deux flèches + bouton fermer, focus visible, aria-labels parlants.
- **Scroll** : s’assurer qu’on ne peut pas scroller le body pendant l’ouverture et que la position initiale est conservée à la fermeture.

