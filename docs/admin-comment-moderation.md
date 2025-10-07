# Modération des commentaires par les administrateurs

## Principe

Les comptes disposant du rôle `ADMIN` peuvent **supprimer** n'importe quel commentaire d'un carnet, indépendamment de leur statut d'auteur ou de propriétaire du carnet. L'édition reste réservée au propriétaire du carnet ou à l'auteur du commentaire pour éviter les altérations de contenu sans traçabilité.

Résumé des règles :

- un admin peut supprimer tous les commentaires mais ne peut pas les éditer ;
- l'auteur peut modifier ou supprimer son propre commentaire ;
- le propriétaire du carnet peut supprimer (mais pas modifier) tout commentaire présent dans ses étapes ;
- un compte désactivé ne peut effectuer aucune action.

## Implémentation

La logique est centralisée dans `DiaryPageComponent` :

- méthode `canManageComment` (ligne `~1030`) :
  - retourne `true` immédiatement si `UserService.isCurrentUserAdmin()` renvoie `true` ;
  - sinon, on vérifie l'état du compte, l'appartenance au carnet puis l'identité de l'auteur.
- Les gestionnaires `onDeleteComment`, `onEditComment`, `onSubmitCommentEdit` s'appuient respectivement sur `canDeleteComment` / `canEditComment` pour autoriser ou bloquer l'action.

```ts
/**
 * Checks whether the viewer can manage (edit/delete) a comment.
 * Admins bypass ownership checks so they can moderate any comment.
 */
canManageComment(comment: Comment | null | undefined): boolean {
  if (!comment) {
    return false;
  }

  if (this.userService.isCurrentUserAdmin()) {
    return true;
  }

  if (this.isViewerDisabled()) {
    return false;
  }

  const viewerId = this.currentViewerId();
  if (!Number.isFinite(viewerId)) {
    return false;
  }

  if (this.isDiaryOwner()) {
    return true;
  }

  return comment.user?.id === viewerId;
}
```

## Tests

- `should let administrators delete any comment`
  1. force le mode admin via `UserServiceStub.setAdmin(true)` ;
  2. déclenche `onDeleteComment` sur un commentaire étranger ;
  3. vérifie que `CommentService.delete` est appelé et que la liste locale est mise à jour.
- `should prevent administrators from editing comments they do not own`
  1. active le mode admin ;
  2. tente d'ouvrir l'édition sur un commentaire tiers ;
  3. confirme que l'édition reste bloquée.

Ces scénarios garantissent la séparation entre suppression globale et édition restreinte.
