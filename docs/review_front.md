# Review Frontend – Travel Blog (Angular)

## 1. Architecture générale
- Application Angular standalone organisée par **features** (`src/app/pages`, `components`, `core`).
- Routage décrit dans `docs/pages.md` et `docs/features.md` : pages principales (`/travels`, `/me`, `/diary/:id`) branchées sur `TravelMapStateService`.
- Couche `core/` regroupe **services API**, **intercepteurs**, **guards** et utilitaires communs.
- `shared/` expose les modèles (`*.model.ts`), helpers (`utils/html.utils.ts`) et composants atomiques (boutons, inputs).
- Documentation de référence : `docs/architecture` (implicite via `features.md`, `state.md`, `ui-components.md`).

## 2. Gestion d’état & réactivité
- **Signals Angular** : décrits dans `docs/SIGNALS.md`. Utilisés surtout sur `/me` pour l’UI réactive sans `async` pipe.
  - `signal()` pour l’état brut.
  - `computed()` pour les dérivés (`sections`, `roleBadges`).
  - `effect()` pour les effets (log, synchronisation route/layout).
- **RxJS** : toujours utilisé pour les flux réseau.
  - `route-driven-effects.md` détaille les effets basés route (`filter-page`, `diary-page`).
  - Les services (`AuthService`, `StepService`, `MediaService`) exposent des `Observable` que les composants transforment en `signal`.
  - Patterns clés : `switchMap`, `shareReplay`, `filter`, `combineLatest` dans `state.md`, `route-driven-effects.md`.

## 3. Sécurité & authentification
- Centralisé dans `docs/security-overview.md` :
  - `AuthService` envoie les requêtes et gère les retours (login/logout/reset).
  - `auth.interceptor.ts` force `withCredentials`, nettoie Cloudinary (plus utilisé depuis le proxy backend, mais garde la compatibilité).
  - Cookie JWT : `SameSite=Lax`, `Secure=true`, HTTPOnly (émis côté API). Compatible `travel-blog.cloud` ↔ `api.travel-blog.cloud`.
  - Guards (`auth.guard.ts`, `admin.guard` via doc) verrouillent les routes.
  - Validation formulaires (mot de passe/forgot password) + neutralisation des messages sensibles (voir `password-reset-flow.md`).

## 4. Gestion des médias (Cloudinary)
- Documentation complète : `docs/cloudinary-upload.md`, `docs/diary-step-creation-flow.md`, `docs/media-lightbox-flow.md`.
  - `MediaGridUploaderComponent` gère la sélection, l’upload (séquentiel), les URLs `blob` et les miniatures.
  - `CloudinaryService` n’envoie plus rien à Cloudinary directement : il poste un `FormData` sur `POST ${apiUrl}/cloudinary/upload`.
  - Les étapes (`CreateStepFormComponent`) et carnets (`CreateDiaryModalComponent`) appellent `ensureUploaded()` avant la soumission métier.
  - Synchronisation BDD via `MediaService.createStepMedia` / `createDiaryMedia`.
  - Lightbox et carousel documentés dans `diary-lightbox.md`, `carousel-usage.md`.

## 5. Géocodage & intégrations API
- `GeocodingService` (voir `docs/geocoding-service.md`) interroge `GET /geocoding/reverse` côté backend (proxy Nominatim).
- Autres services clés :
  - `StepService`, `TravelDiaryService` (`docs/steps.md`, `docs/travel-map-layout-page`).
  - `UserService`, `ThemeService` (`docs/me-page-overview.md`, `data-layer-updates.md`).
  - Utilisation de `HttpParams`, `HttpClient` standard avec gestion d’erreurs centralisée (`controlErrors.md`).

## 6. Emails Brevo & réinitialisation mot de passe
- Flux décrit dans `docs/password-reset-flow.md`.
  - Front : `ForgotPasswordFormComponent`, `ResetPasswordPageComponent` valident les entrées, affichent les erreurs.
  - Brevo n’est jamais appelé directement : le front déclenche `/auth/forgot-password`, le backend gère l’envoi. Documentation front-insiste sur UX/étapes.

## 7. Sécurité UI supplémentaire
- Sanitisation HTML : `utils/html.utils.ts`, pipes `safeHtml` (`docs/media-handling.md`, `modals.md`).
- Politique de thème/roles (`docs/me-page-admin-changes.md`, `admin-role-toggle.md`).
- Composants modals, top bar, etc. décrits pour éviter les fuites de state (`docs/modals.md`, `top-bar-navigation.md`).

## 8. Déploiement & configuration
- `docs/configuration.md` + `docs/backend-api.md` décrivent :
  - Fichiers d’environnement (`src/environments/environment(.prod).ts`) → `apiUrl`, `nominatimBaseUrl`, etc.
  - Commandes : `npm start`, `npm run build --configuration production`, `npm test`, `npm run cypress:test`.
  - Couche CI/format : `npm run lint`, `npm run format`.
- Pour la prod : build Angular, déploiement statique (ou conteneur) avec `environment.prod.ts` pointant sur `https://api.travel-blog.cloud`.

## 9. Tests & qualité
- `docs/guide-cypress.md` : scénarios E2E (stubs API, intercepts Cloudinary, etc.).
- `docs/configuration.md` : séparation TS pour Jasmine/Cypress.
- Specs unitaires autour des guards (`auth.guard.spec.ts`), services (`step.service.spec.ts`), composants (top-bar, create-step-form).
- Simplification log : `docs/simplification-log.md` suit les refactors (ex : signaux, Cloudinary).

## 10. Points d’attention techniques
- **Cloudinary** : tout passe par le proxy backend → vérifier que `apiUrl` est correct dans les environnements, et que l’intercepteur ne supprime pas d’entêtes utiles.
- **Brevo** : dépend du service backend ; le front doit gérer les retours silencieux (toujours 204).
- **JWT** : cookies `SameSite=Lax`, `Secure` ⇒ nécessité de servir le front en HTTPS même en préprod.
- **RxJS + Signals** : maintenir la séparation source (Observable) → vue (signal). Documentation signal utile pour onboard nouveaux devs.
- **Architecture** : préférer services `core/` + docs existants pour décrire les flux avant d’ajouter de nouvelles features.
- **Déploiement** : pas de staging → tester en local en mode prod (`ng build --configuration production`) + QA manuelle.

## 11. Ressources clés (navigation rapide)
- Cloudinary : `docs/cloudinary-upload.md`, `docs/diary-step-creation-flow.md`.
- Sécurité / JWT / Brevo : `docs/security-overview.md`, `docs/password-reset-flow.md`.
- RxJS / Signals : `docs/SIGNALS.md`, `docs/route-driven-effects.md`, `docs/data-layer-updates.md`.
- Architecture : `docs/features.md`, `docs/state.md`, `docs/ui-components.md`.
- Déploiement : `docs/configuration.md`, `docs/backend-api.md`.
