# Guide éditeur riche (Quill)

Ce document résume la manière dont l’éditeur Quill est intégré dans l’application et
comment l’utiliser pour créer / afficher du contenu riche sur les étapes.

## Modifications clés

- Les descriptions d’étape affichées dans `DiaryPageComponent` utilisent désormais `[innerHTML]="... | safeHtml"`
  combiné à la classe `ql-editor` pour reproduire fidèlement la mise en forme Quill.
- Le pipe standalone `SafeHtmlPipe` assure la sanitisation/sécurisation tout en conservant les couleurs, tailles,
  alignements et liens (http/https/mailto, images en data URI).
- Les styles de rendu ont été enrichis dans `diary-page.component.scss` (marges des paragraphes, couleurs de titres,
  citation, etc.) pour compléter la feuille `quill.snow.css` chargée globalement.

## Architecture

- **Composant partagé** : `src/app/shared/editor/editor.component.ts`
  - Standalone Angular component (`selector: app-editor`).
  - Encapsulation désactivée (`ViewEncapsulation.None`) pour laisser les feuilles de style Quill agir.
  - Expose plusieurs entrées :
    - `content` *(obligatoire)* : HTML Quill (liaison bi‐directionnelle possible avec `[(content)]`).
    - `customConfig` : surcharge partielle de la config Quill `QuillOptions`.
    - `label`, `placeholder`, `theme`, `readOnly`, `maxLength` (limite douce côté client).
  - Sortie `contentChange` : émet le HTML à chaque modification (pratique pour relayer vers un `FormGroup`).
  - Méthode publique `getCleanContent()` : nettoie la sortie Quill (suppression `<p>` vides, espaces et `&nbsp;`).

- **Configuration par défaut** (`defaultConfig`)
  - Barre d’outils : titres (h2–h6), gras/italique/souligné, couleurs, listes, police, bouton « nettoyer ».
  - Les thèmes Quill (snow + bubble) sont ajoutés dans `angular.json` → `styles` pour être disponibles globalement.

- **Feuilles de styles associées** : `src/app/shared/editor/editor.component.scss`.
  - Ajuste la toolbar, le conteneur et quelques classes utilitaires.

## Utilisation dans un formulaire (ex. création d’étape)

```html
<app-editor
  [(content)]="stepEditorContent"
  [label]="'Contenu de l\'étape'"
  [placeholder]="'Ajoutez votre récit, vos liens, etc.'"
  [maxLength]="4000"
  (contentChange)="onEditorChange($event)"
></app-editor>
```

Dans le composant parent :

```ts
stepEditorContent = '';

onEditorChange(html: string): void {
  this.stepForm.patchValue({ description: html }, { emitEvent: false });
  this.stepForm.get('description')?.markAsDirty();
}

submit() {
  const payload = {
    ...,
    description: this.editor.getCleanContent(), // optionnel : contenu « nettoyé »
  };
}
```

### Personnaliser la barre d’outils

L’entrée `customConfig` accepte un objet `QuillOptions`. Exemple :

```ts
modules = {
  toolbar: [
    [{ header: [1, 2, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'blockquote', 'code-block'],
  ],
};

customConfig: QuillOptions = {
  modules: this.modules,
  theme: 'snow',
  placeholder: 'Racontez votre étape…',
};
```

```html
<app-editor
  [(content)]="content"
  [customConfig]="customConfig"
  [theme]="'snow'"
></app-editor>
```

## Affichage du contenu Quill

- Utiliser le pipe `safeHtml` (`src/app/shared/pipes/safe-html.pipe.ts`) pour conserver les styles lors de la restitution :

```html
<div class="step__content ql-editor" [innerHTML]="step.description | safeHtml"></div>
```

- Le pipe applique une sanitisation personnalisée (suppression des balises interdites, filtrage des attributs) tout en
  conservant les styles inline utiles (`color`, `background-color`, `font-size`, `text-align`).
- Ajouter la classe `ql-editor` permet de réutiliser la feuille de style Quill (`quill.snow.css`) pour les couleurs,
  tailles et alignements. Les styles spécifiques (ex. marges) sont complétés dans `diary-page.component.scss`.
- Les couleurs / fonds / tailles appliqués via la toolbar sont conservés (inline `style` filtré pour ne garder que les
  propriétés autorisées) ; les autres attributs sont supprimés pour éviter les injections.

### Détail du pipe `safeHtml`

- Localisation : `src/app/shared/pipes/safe-html.pipe.ts` (standalone pipe importable dans chaque composant Angular).
- Fonctionnement :
  1. Parse le HTML reçu et parcourt tous les nœuds.
  2. Supprime les balises non autorisées (unwrap) mais conserve leur contenu.
  3. Nettoie les attributs :
     - conserve seulement `class`, `style` + les attributs spécifiques déclarés (ex. `href`, `target`, `rel`, `src`).
     - rejette les attributs commençant par `on*` ou `data-ql-*`.
     - force `target="_blank"` + `rel="noopener noreferrer"` sur les liens.
     - valide les URL (`http`, `https`, `mailto`, `data:image` pour les images).
  4. Filtre les styles inline pour ne garder que `color`, `background-color`, `font-size` et `text-align` (formats
     hex/rgb/rgba et tailles px/em/rem/%/noms Quill).
  5. Retourne la chaîne nettoyée et la marque comme `SafeHtml` via `DomSanitizer`.
- Exemple d’import dans un composant :

```ts
@Component({
  selector: 'app-world-map-page',
  standalone: true,
  imports: [SafeHtmlPipe, /* autres dépendances */],
  /* ... */
})
export class DiaryPageComponent {}
```

```html
<ng-container *ngFor="let step of steps">
  <div class="step__content ql-editor" [innerHTML]="step.description | safeHtml"></div>
</ng-container>
```

- Avantage : les styles saisis dans Quill (ex. `<span style="color: rgb(230, 0, 0);">`) ressortent identiques côté
  lecture, sans exposer le DOM à du JavaScript inline ni à des attributs dangereux.


## Bonnes pratiques

1. **Longueur** : fixer `maxLength` selon le besoin et afficher `charCount` (déjà implémenté dans `EditorComponent`).
2. **Nettoyage** : utiliser `getCleanContent()` avant sauvegarde si vous souhaitez enlever les paragraphes vides.
3. **Sanitisation** : ne jamais interpoler `{{ }}` pour afficher le HTML ; préférer `[innerHTML]` + `safeHtml`.
4. **Tests** : couvrir les cas principaux via l’éditeur sur la page `test-page` (`src/app/pages/test-page`).

## Ressources

- Documentation Quill : https://quilljs.com/docs/configuration
- `ngx-quill` : https://github.com/KillerCodeMonkey/ngx-quill
- Exemple end-to-end : `CreateStepFormComponent` (formulaire d’étape) + `DiaryPageComponent` (affichage du contenu).
