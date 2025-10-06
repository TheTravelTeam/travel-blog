# Gestion des guards de routes

## Objectif

Protéger l'accès aux pages sensibles de l'application Angular (par exemple `/me`) tout en laissant les pages publiques accessibles, et empêcher un utilisateur déjà connecté de revenir sur les écrans de connexion.

## Guards disponibles

### `authGuard`
- **Fichier** : `src/app/core/guards/auth.guard.ts`
- **Responsabilité** : vérifier qu'un utilisateur est authentifié avant d'accéder à une route protégée.
- **Comportement** :
  1. Si `AuthService.currentUser()` retourne un utilisateur, la navigation est autorisée immédiatement.
  2. Sinon, le guard appelle `AuthService.loadCurrentUser()` :
     - si la requête renvoie un profil, la navigation est autorisée ;
     - si l'appel échoue ou renvoie `null`, le guard produit un `UrlTree` vers `/login`.
- **Usage typique** :
  ```ts
  { path: 'me', component: MePageComponent, canActivate: [authGuard] }
  ```

### `visitorOnlyGuard`
- **Fichier** : `src/app/core/guards/visitor-only.guard.ts`
- **Responsabilité** : empêcher un utilisateur déjà connecté d'accéder aux pages réservées aux visiteurs (login/register/forgot-password/reset-password).
- **Comportement** :
  1. Si `AuthService.currentUser()` retourne un utilisateur, renvoie un `UrlTree` vers `/` (Angular interrompt la navigation et redirige).
  2. Sinon, le guard tente `AuthService.loadCurrentUser()` : si un profil est renvoyé, il redirige vers `/`, sinon la navigation est autorisée.
  3. Si l'appel API échoue (ex. retour 401), `catchError(() => of(true))` autorise la navigation pour ne pas bloquer un visiteur légitime.
- **Usage typique** :
  ```ts
  { path: 'login', component: LoginFormComponent, canActivate: [visitorOnlyGuard] }
  ```

## Configuration des routes

Voir `src/app/app.routes.ts` :
- Pages publiques : `/`, `/articles`, `/articles/:articleId`, `/travels`, `/test`.
- Pages visiteurs uniquement : `/login`, `/register`, `/forgot-password`, `/reset-password`.
- Page protégée : `/me` (requiert `authGuard`).

## Tests

- `auth.guard.spec.ts` : s'assure que l'utilisateur authentifié passe et que l'utilisateur non authentifié est redirigé vers `/login` avec le bon `redirectTo`.
- `visitor-only.guard.spec.ts` : vérifie que les visiteurs sont acceptés et que les utilisateurs connectés sont renvoyés vers `/`.

Commande de test ciblée :
```
npm run test -- --watch=false --browsers=ChromeHeadless --include=src/app/core/guards/auth.guard.spec.ts,src/app/core/guards/visitor-only.guard.spec.ts
```
*(À exécuter en local si Karma ne peut pas ouvrir le port 9876 dans le sandbox.)*

## Étapes de validation manuelle

1. Déconnexion : accéder à `/me` → redirection vers `/login`.
2. Connexion : accéder à `/login` alors qu'on est déjà connecté → redirection vers `/`.
3. Navigation publique : `/`, `/articles`, `/travels` accessibles sans authentification.

## Questions fréquentes

### Pourquoi utiliser `createUrlTree` dans un guard ?
`router.createUrlTree(['/'])` indique au routeur qu'il doit annuler la navigation actuelle et enchaîner directement sur `/`. Cela évite les "flashs" d'URL (par exemple `/login`) et garantit que la navigation vers la cible est gérée par Angular.

### À quoi sert `catchError(() => of(true))` dans `visitorOnlyGuard` ?
Lorsque `loadCurrentUser()` retourne une erreur (401, réseau indisponible, etc.), on considère que l'utilisateur n'est pas connecté et on le laisse accéder à la page visiteur. Le `catchError` renvoie donc `true` pour autoriser la navigation plutôt que de bloquer l'écran.
