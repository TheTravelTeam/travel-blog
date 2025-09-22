# Top Bar – Accès aux carnets

## Résumé
- La top-bar détermine l'utilisateur connecté via `UserService.currentUserId()`.
- Le lien "Carnet de voyage" n'apparaît que si l'utilisateur est authentifié et qu'un identifiant a pu être extrait du JWT.
- Le bouton redirige vers `/travels/users/{currentUserId}` qui charge les carnets via `MyTravelsPageComponent`.

## Détails techniques
- `TopBarComponent` expose `currentUserId` et `canDisplayDiariesLink`. Les templates desktop/mobile utilisent ces getters pour conditionner le rendu (`src/app/components/Organisms/Top-bar/top-bar.component.html`).
- `MyTravelsPageComponent` consomme l'identifiant de la route s'il est présent, sinon retombe sur `UserService.currentUserId()` pour afficher les carnets du profil courant.
- L'image de couverture des cartes est fournie par `TravelMapStateService.getDiaryCoverUrl`, garantissant un comportement identique entre la page `/travels/users/:id`, `/travels/:id` et `/me`.

## À présenter pendant la démo
1. Connexion : afficher que le lien "Carnet de voyage" apparait/disparait selon l'état de session.
2. Clic sur le lien : la page `/travels/users/{id}` se charge avec les mêmes vignettes que sur `/me`.
3. Souligner que le backend n'expose qu'un champ `media`; toutes les pages passent par la même logique pour éviter les divergences.
