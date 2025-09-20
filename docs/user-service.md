# User Service & DTOs

## Périmètre couvert
Ce document décrit l'implémentation actuelle du service `UserService` (`src/app/core/services/user.service.ts`), des structures associées (`src/app/shared/dto/user-profile.dto.ts`, `src/app/shared/model/user-profile.model.ts`) ainsi que les tests unitaires situés dans `src/app/core/services/user.service.spec.ts`.

---

## Rôle du `UserService`
Le service centralise tous les accès au profil utilisateur côté front.

- **`getCurrentUserProfile()`**
  - Décode l'identifiant depuis le JWT via `currentUserId()`.
  - Émet une erreur `"L'utilisateur n'est pas authentifié"` si aucun identifiant valide n'est disponible.
  - Délègue ensuite à `getUserProfile(id)` pour récupérer et normaliser les données.

- **`getUserProfile(userId: number)`**
  - Effectue un `GET {apiUrl}/users/:id` et mappe le `UserProfileDto` reçu dans le modèle applicatif `UserProfile`.
  - La normalisation supprime le préfixe `ROLE_` et applique `['USER']` par défaut si la liste des rôles est vide.

- **`currentUserId()`**
  - Récupère le token depuis `AuthService`.
  - Retourne `null` si le token est absent ou si le décodage échoue.
  - Accepte strictement un claim numérique `userId`. Aucune valeur dérivée de `sub` ou autre fallback n'est tolérée afin d'éviter d'afficher un autre compte qu'un utilisateur authentifié.

---

## Structures de données associées
- **`UserProfileDto`** (`src/app/shared/dto/user-profile.dto.ts`)
  - Reflète fidèlement la réponse brute de l'API (tous les champs optionnels et les `null` possibles sont conservés).
  - Contient la liste des carnets (`travelDiaries`) déjà typée avec `TravelDiary`.

- **`UserProfile`** (`src/app/shared/model/user-profile.model.ts`)
  - Modèle consommé par l'UI après normalisation : rôles transformés en majuscules, valeurs par défaut injectées.
  - Maintient la compatibilité avec les composants de la page `/me` qui s'appuient sur ces données.

---

## Stratégie de tests (`user.service.spec.ts`)
Les tests unitaires utilisent un stub `AuthService` pour contrôler les tokens sans dépendre de `localStorage`.

> ℹ️ Les tests s'appuient sur trois tokens JWT factices (`TOKEN_WITH_NUMERIC_UID`, `TOKEN_WITH_NON_NUMERIC_UID`, `TOKEN_WITH_INVALID_STRUCTURE`) afin d'exercer le vrai `jwtDecode` sans avoir recours à des espions Jasmine.

### Déroulé détaillé des tests

1. **`should load the current user profile with the id decoded from the token`** (`src/app/core/services/user.service.spec.ts:53`)
   1. `AuthServiceStub.saveToken(...)` initialise le faux stockage de token avec la valeur souhaitée.
   2. `AuthServiceStub.saveToken(TOKEN_WITH_NUMERIC_UID)` injecte un token contenant `uid: 42` dans sa charge utile.
   3. On souscrit à `getCurrentUserProfile()` et on capture les valeurs `profileId` et `roles` dans des variables locales.
   4. `HttpTestingController.expectOne` vérifie qu'un `GET` est émis vers `${environment.apiUrl}/users/42`.
   5. `request.flush(dto)` renvoie un DTO simplifié contenant des rôles hétérogènes (`ROLE_admin`, `editor`).
   6. Les `expect` finaux valident l'id mappé et la normalisation des rôles en `['ADMIN', 'EDITOR']`.

2. **`should emit an error when requesting current user profile without authentication`** (`src/app/core/services/user.service.spec.ts:82`)
   1. Le stub de l'authentification est remis à `null` pour simuler l'absence de token.
   2. `getCurrentUserProfile()` est souscrit avec un objet observateur `{ next, error }` : `next` appelle `done.fail(...)` si jamais il est déclenché, tandis que `error` vérifie le message d'échec attendu.
   3. `httpMock.expectNone` confirme qu'aucune requête HTTP n'est partie.
   4. L'assertion s'assure que le message d'erreur renvoyé est bien `"L'utilisateur n'est pas authentifié"`.

3. **`should default to USER role when API returns no roles`** (`src/app/core/services/user.service.spec.ts:96`)
   1. `getUserProfile(7)` est invoqué directement pour ignorer tout décodage de JWT.
   2. On passe une fonction à `subscribe((profile) => { ... })` : cette fonction observatrice extrait `profile.roles` et les stocke dans `receivedRoles` pour la vérification.
   3. `expectOne` vérifie l'URL `.../users/7` et impose la méthode `GET`.
   4. `flush` renvoie un DTO avec `roles: []`.
   5. L'assertion finale confirme la valeur par défaut `['USER']` dans le modèle applicatif.

4. **`should return null when no token is stored`** (`src/app/core/services/user.service.spec.ts:119`)
   1. Le stub de token est remis à `null`.
   2. `currentUserId()` est appelé directement.
   3. L'assertion valide que la méthode retourne `null` sans lever d'erreur.

5. **`should return null when token does not expose a numeric userId`** (`src/app/core/services/user.service.spec.ts:127`)
   1. Un token arbitraire est enregistré dans le stub.
   2. Le stub enregistre `TOKEN_WITH_NON_NUMERIC_UID`, dont la charge utile expose `uid: 'abc'`.
   3. `currentUserId()` doit retourner `null`, ce qu'on vérifie avec `expect`.

6. **`should return null when token decoding fails`** (`src/app/core/services/user.service.spec.ts:136`)
   1. Un token fictif est posé.
   2. `TOKEN_WITH_INVALID_STRUCTURE` est placé dans le stub, ce qui fait lever `InvalidTokenError` par `jwtDecode` lors de l'appel à `currentUserId()`.
   3. `currentUserId()` gère l'exception, trace un `console.warn`, et renvoie `null` — valeur validée par l'assertion.

Dans tous les tests, `httpMock.verify()` en `afterEach` garantit qu'aucune requête orpheline n'est restée en file.

---

## Lancer les tests
```bash
npm run test -- --watch=false --browsers=ChromeHeadless
```
> ⚠️ Le sandbox CI actuel bloque le port Karma (9876). Exécuter la commande sur une machine locale qui autorise l'ouverture du port pour valider la suite.

---
