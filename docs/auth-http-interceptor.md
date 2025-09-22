# Auth HTTP Interceptor

## Objectif
Garantir que toutes les requetes protogenees par Spring Security portent le jeton JWT admin sans repliquer le code d'ajout d'en-tete a chaque service Angular.

## Implementation
- Fichier: `src/app/core/interceptors/auth.interceptor.ts`
- Intercepteur base sur `HttpInterceptorFn` (Angular 16+) qui :
  - recupere la dependance `AuthService` via `inject`. 
  - lit le token stocke en local (`AuthService.getToken`).
  - ignore les requetes de connexion (`/auth/login`) ou celles qui fixent deja `Authorization`.
  - clone la requete et ajoute `Authorization: Bearer <token>` pour les autres appels.

## Enregistrement global
Configure dans `app.config.ts` via `provideHttpClient(withInterceptors([authInterceptor]))`, ce qui le rend actif pour l'ensemble de l'application. Lors d'une presentation, rappeler que `provideHttpClient` remplace l'ancien `HttpClientModule` et accepte les interceptors via des factories (`withInterceptors`).

### Integration tests
- Les specs (`me-page.component.spec.ts`) recourent a `provideHttpClient(withInterceptorsFromDi())` pour reutiliser la meme configuration en test, puis `provideHttpClientTesting()` pour substituer un backend en memoire. Cela garantit que l'intercepteur est toujours en place (utile pour verifier les en-tetes) tout en controlant les reponses.

## Points de vigilance
- Si une route doit volontairement omettre le header, il suffit de definir `Authorization` manuellement avant emission (l'intercepteur ne l'ecrasera pas).
- Le token doit rester a jour. `AuthService.saveToken` est appele a la connexion et peut etre complete plus tard pour un renouvellement.

## Tests
- Verifier le succes du toggle admin et des operations admin-only.
- En cas de 401, confirmer que le token est valide et non expire.
