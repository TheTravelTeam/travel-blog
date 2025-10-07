# Composant `app-pagination`

## Vue d'ensemble

Le composant `app-pagination` fournit une pagination simple et réutilisable pour les listes Angular. Il fonctionne en mode contrôlé : le parent lui transmet le nombre total d'éléments, la taille de page, la page courante et réagit aux changements via un événement `pageChange`.

- Emplacement : `src/app/components/Molecules/pagination`
- Type : composant standalone (Angular 17)
- Dépendance unique : `CommonModule`

## API

| Entrée           | Type    | Description                                                            |
|------------------|---------|------------------------------------------------------------------------|
| `totalItems`     | number  | Nombre total d'éléments à paginer.                                     |
| `itemsPerPage`   | number  | Taille d'une page. Valeur minimale : `1`.                              |
| `currentPage`    | number  | Index courant (1-based). Le composant recadre la valeur si nécessaire. |

| Sortie        | Type   | Description                                  |
|---------------|--------|----------------------------------------------|
| `pageChange`  | number | Émis lorsqu'une page différente est choisie. |

Le composant affiche des boutons « précédent / suivant », la liste des pages et un résumé `Page X / Y`. Les boutons sont automatiquement désactivés en début/fin de plage.

## Exemple minimal

```html
<app-pagination
  [totalItems]="items.length"
  [itemsPerPage]="pageSize"
  [currentPage]="currentPage()"
  (pageChange)="onPageChange($event)"
></app-pagination>
```

Correspondance TypeScript :

```ts
readonly pageSize = 10;
readonly currentPage = signal(1);
readonly paginatedItems = computed(() => {
  const start = (this.currentPage() - 1) * this.pageSize;
  return this.items().slice(start, start + this.pageSize);
});

onPageChange(page: number): void {
  this.currentPage.set(page);
}
```

## Intégration dans la « Me Page »

- **Carnets** : `paginatedDiaries` tronque la liste en fonction de `diariesCurrentPage` avant rendu.
- **Articles** : la pagination se base sur `filteredArticles()` pour conserver la recherche utilisateur.
- **Section Admin** : double pagination (liste des utilisateurs et carnets du profil sélectionné) avec remise à `1` quand le filtre ou la sélection change.

## Bonnes pratiques

1. Recalculez votre page courante lorsque la source change (`effect` ou `computed`) pour éviter les pages vides après suppression.
2. Réinitialisez la page à `1` quand un filtre modifie le nombre d'éléments (ex. champ de recherche).
3. Conservez la logique de découpage dans un `computed` afin de ne pas muter directement vos collections.
4. Stylisez l'instance via une classe utilitaire (`class="me-page__pagination"`, etc.) plutôt que de modifier le composant.
