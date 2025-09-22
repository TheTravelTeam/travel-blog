# Ajustements UI (Atoms & Molecules)

## `app-button`
- `htmlType` est maintenant un `@Input` obligatoire (`button`, `submit`, `reset`) applique via `[attr.type]` dans le template (`button.component.html:2`).
- `btn.model.ts` definit `htmlType: 'submit'` par defaut afin d'eviter un comportement implicite lors de l'utilisation dans des formulaires.

## `app-text-input`
- Nouveau `@Input() autocomplete` propage a l'attribut natif via `[attr.autocomplete]`. L'utilisation directe de `[attr.autocomplete]` (et non `[autocomplete]`) evite de rendre l'attribut lorsque la valeur est vide (`null` dans le template), ce qui laisse au navigateur la gestion par defaut.
- La base `textInputDefault` definie dans `text-input.component.ts` expose `autocomplete: ''` pour conserver un comportement neutre tant que le parent ne precise pas la valeur (ex. `one-time-code`, `new-password`).
- Le template (`text-input.component.html`) vehicule l'attribut avec :
  ```html
  <input
    [attr.autocomplete]="autocomplete || null"
    ...
  />
  ```
  Cette approche explicite est utile dans les formulaires sensibles (mot de passe, OTP) ou lors de demo pour expliquer la configuration d'autocompletion.

## `app-select`
- Le composant standalone gere l'accessibilite : chaque option recoit un `id` stable (`activeOptionId`) et `toggleItem` synchronise la selection simple/multiple.
- `syncSelectionFromInputs` maintient l'etat interne lorsque `selectedId` ou `itemsList` est mis a jour depuis l'exterieur :
  ```ts
  private syncSelectionFromInputs(): void {
    if (this.withMutipleSelect) {
      return; // on laisse la logique multi-selection gerer son propre signal
    }
    if (!Array.isArray(this.itemsList) || !this.itemsList.length) {
      this.oneItemSelected.set(undefined);
      return;
    }
    if (this.selectedId == null) {
      this.oneItemSelected.set(undefined);
      return;
    }
    const matchingItem = this.itemsList.find((item) => item.id === this.selectedId);
    this.oneItemSelected.set(matchingItem);
  }
  ```
  Ce morceau est important a presenter : il explique comment la selection reste coherente quand le parent recharge la liste (ex. depuis `/me` apres un appel API) sans forcer l'utilisateur a re-ouvrir la dropdown.
- `focusItem`, `openAndFocusFirst`, `setDropdownVisibility` organisent le roving focus clavier; `ClickOutsideDirective` ferme le panel en dehors des interactions.

## `app-divider`
- Le composant pilote les classes CSS directement sur l'element hote grace a `@HostBinding` :
  ```ts
  @HostBinding('class.divider-host') readonly dividerHostClass = true;
  @HostBinding('class.divider-host--horizontal') get isHorizontalHost() {
    return this.orientation === 'horizontal';
  }
  @HostBinding('class.divider-host--vertical') get isVerticalHost() {
    return this.orientation === 'vertical';
  }
  ```
  Lors d'une presentation, preciser que cette technique evite d'avoir un `div` enveloppant ou des `ngClass` repetes dans le template : l'etat (`orientation`) reste local au composant et les styles (`divider-host*`) s'appliquent automatiquement.
- SCSS re-organise : l'element hote applique maintenant des classes `divider-host--horizontal/vertical` pour supporter les contexts flex ou inline (`divider.component.scss`).
- Les transitions de largeur/hauteur rendent les animations plus douces lors du passage mobile -> desktop.

## `app-travel-diary-card`
- Les signaux `isTablet`, `isMobile`, `isMobileOrTablet` du `BreakpointService` sont exposes pour la logique de template responsive.
- `@Input() showInlineActions = true;` controle l'affichage des boutons "Modifier" / "Supprimer". Dans `/me`, on passe `false` pour les cartes affichees a l'interieur de la liste admin (afin de confier les actions au footer dedie). Cette propriete est pratique a montrer en demo pour evidencier un meme composant re-utilisable en lecture seule.
- Les sorties `edit`, `delete`, `cardClick` restent typees sur `id`.
- Le template (et `.scss`) gere la disposition des boutons de contexte et l'etat `isAltBackground` pour un second jeu de couleurs.

## Specifications associees
- `travel-diary-card.component.spec.ts` couvre l'affichage des ressources (image, titre) et verifie que les sorties emettent le bon identifiant.
- Les tests `user.service.spec.ts` et `me-page.component.spec.ts` ont ete ajustes afin d'utiliser les nouveaux services / endpoints decrits dans cette documentation.
