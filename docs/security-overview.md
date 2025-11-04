# Sécurité de l'application Travel Blog

Ce document couvre toutes les couches de sécurité du projet, du front Angular jusqu'au backend Spring Boot. Il précise **les protections actives**, **où elles se trouvent**, et **quelles failles elles adressent**.

---

## 1. Résumé global

| Couche | Fichier(s) clés | Risques couverts |
|--------|-----------------|------------------|
| Formulaires Angular | `forgot-password-form`, `reset-password-page`, etc. | Inputs invalides, XSS basique côté client, UX de validation |
| Services frontend | `AuthService`, `CloudinaryService`, `StepService`… | URL d’API centralisées, withCredentials cohérent (CSRF cookie), centralisation des erreurs |
| Guards/Interceptors | `route-guards.md`, `auth-http-interceptor` | Redirection si non authentifié/autorisé, ajout automatique de cookies JWT |
| Backend Spring Security | `SecurityConfig`, `JWTAuthenticationFilter`, `JWTService` | Authentification, autorisations par rôle, CORS, session stateless |
| DTO & Validation | `ForgotPasswordRequestDTO`, `StepRequestDTO`, etc. + Bean Validation (`@Valid`, `@NotBlank`, `@Email`) | Champs requis, formats, prévention injection SQL/XSS via binding typé |
| Password reset | `PasswordResetService`, `ForgotPasswordFormComponent` | Jeton aléatoire, TTL, aucun leak d’existence du compte |
| Hash mots de passe | `BCryptPasswordEncoder` | Vulnérabilité brute-force, stockage sécurisé |
| JWT & cookies | `JWTService`, `JWTAuthenticationFilter` | Sessions stateless, revocation via suppression cookie |
| CORS/CSRF | Config Spring (CORS + cookies HTTPOnly) | Requêtes cross-origin contrôlées, mitigations CSRF via cookie/httpOnly |
| Rôles & @PreAuthorize | Endpoints limités (ADMIN / USER) | Escalade de privilèges |
| Gestion erreurs | `ResourceNotFoundException`, `InvalidPasswordResetTokenException`… | Messages neutres, masquage infos sensibles |

---

## 2. Front-end (Angular)

### 2.1 Formulaires & Validators
- **Références :** `src/app/components/Organisms/*` (forgot/reset password, create step, login, register…).
- Chaque formulaire Angular repose sur `FormGroup` + Validators (`required`, `email`, patterns). Exemple : `ForgotPasswordFormComponent` exige un `email` valide.
- **Faille couverte :** erreurs utilisateur (typos, champs vides) et XSS basique (les champs invalides ne sont pas soumis). Cela ne remplace pas la validation backend mais améliore UX.

### 2.2 Service d’authentification (`AuthService`)
- Méthodes : `login`, `register`, `requestPasswordReset`, `resetPassword`, `loadCurrentUser`, `logout`.
- Utilise `withCredentials` pour transmettre / lire cookie JWT (HTTPOnly). Le backend émet désormais le cookie avec `SameSite=Lax` + `Secure=true`, ce qui suffit pour `travel-blog.cloud` ↔ `api.travel-blog.cloud` tout en bloquant les requêtes cross-site externes.
- **Risque couvert :** duplication d’URL d’API, oublis de credentials ; centralise les flux sensibles.

### 2.3 Route Guards / Interceptors
- `route-guards.md` & `auth-http-interceptor.ts` :
  - Guards redirigent vers `/login` si route protégée sans session.
  - Interceptor attache `withCredentials` + gère erreurs 401 pour logout.
- **Failles couvertes :** navigation non autorisée côté client (note : renforcement côté serveur indispensable).

### 2.4 Composants sensibles
- `MediaGridUploader`: n’accepte que les fichiers côté front, gère erreurs. Ne stocke rien en local persistant.
- `ResetPasswordPageComponent`: lit `token` via query, refuse soumission sans token, affiche feedback constant.
- **Faille couverte :** saisies invalides, reconduction de token absent.

---

## 3. Backend (Spring Boot)

### 3.1 Security Config (`SecurityConfig`)
- **BCrypt** : `@Bean PasswordEncoder()` ⇒ tous les mots de passe sont hashés avec `BCryptPasswordEncoder`, résistant au brute-force.
- **JWT cookie** : `JWTAuthenticationFilter` lit le cookie `jwt` (HTTPOnly) et positionne l’authent utilisateur.
- **CORS** : origines autorisées restreintes à `cors.allowed-origin`. Mentions explicites des headers acceptés, credentials autorisés ⇒ Csrf cookie accessible mais HTTPOnly.
- **Routes publiques / privées** : `authorizeHttpRequests` décrit les endpoints `permitAll` (auth, GET publics) VS `authenticated`.
- **Session stateless** : `SessionCreationPolicy.STATELESS` ⇒ pas de session serveur ⇒ JWT comme preuve unique.
- **Faille couverte :** accès non autorisés, escalade de privilèges, exploitation session côté serveur.

### 3.2 JWT Authentication
- `JWTService.generateToken` : subject = email, claims `roles`, `uid`, expiration configurable (`security.jwt.expiration-time`).
- `JWTAuthenticationFilter` :
  - Extrait cookie `jwt` → vérifie expiration, charge `UserDetails`.
  - Si token expiré ou invalide, supprime le cookie (`clearJwtCookie`).
- `CustomUserDetailsService` (non montré ici) : charge les rôles depuis la base.
- **Faille couverte :** faux token, token expiré, session reuse. Les rôles dans le token sont vérifiés côté serveur.

### 3.3 DTO & Validation (Bean Validation)
- Exemples : `ForgotPasswordRequestDTO` (`@Email`, `@NotBlank`), `PasswordResetRequestDTO`, `CreateTravelDiaryDTO`, etc.
- Les contrôleurs annotent les paramètres `@Valid` ⇒ rejet automatique avec statut 400 si invalide.
- Réduit le risque d’injection, inputs mal formés, manque de champs obligatoires.

### 3.4 Password Reset sécurisé
- `PasswordResetService.requestPasswordReset` :
  - Normalise email → `UserRepository.findByEmail`.
  - Génère token `UUID`, TTL configurable (par défaut 30 min).
  - Supprime tokens précédents, sauvegarde en base.
  - Construit URL front (`app.frontend-base-url`), crée email localisé.
  - Envoie via `MailService` (Brevo). Si échec SMTP (`MailException`) → `ExternalServiceException` mais **pas de rollback** (token conservé pour réessayer manuellement).
  - Retourne silence côté client (toujours 204) ⇒ ne divulgue pas l’existence du compte (mitige enumeration).
- `resetPassword(token, password)` :
  - Vérifie token existant → sinon `InvalidPasswordResetTokenException` (401/400).
  - Vérifie expiration date → supprime token et lève `ExpiredPasswordResetTokenException` (410).
  - Encode mot de passe via `PasswordEncoder`, supprime tokens restants.
- **Failles couvertes :** enumeration compte, vol de mot de passe, réutilisation token, brute force sur ancien password.

### 3.5 MailService (Brevo)
- Encapsule l’envoi. Exceptions SMTP loggées en WARN mais pas renvoyées au client.
- API key stockée côté serveur ⇒ le front ne possède jamais la clé Brevo.

### 3.6 Exceptions dédiées
- `InvalidPasswordResetRequestException`, `InvalidPasswordResetTokenException`, `ExpiredPasswordResetTokenException`, `ResourceNotFoundException`, `ExternalServiceException`…
- Fournissent des messages neutres, masque l’état interne.

### 3.7 Repositories / Modèles
- `PasswordResetToken` : stocke `token`, `user`, `expiresAt`, `createdAt`.
- `PasswordResetTokenRepository.deleteByUser(user)` : garantit qu’un seul token actif par utilisateur.
- `User.password` toujours persisté hashé (BCrypt).

---

## 4. Protections côté infrastructure / configuration
- `application.properties` :
  - `security.jwt.secret-key` : clé signant les JWT.
  - `security.jwt.expiration-time` : TTL en millisecondes.
  - `auth.password-reset.token-ttl-minutes` : TTL tokens reset (faille couverte : tokens valides trop longtemps).
  - `cors.allowed-origin` : whitelist d’origines.
- `application-prod.properties` (si existant) doit garder ces valeurs secrètes (ENV). Cf. `.env.sample` côté front/back.

---

## 5. Récapitulatif des failles et contre-mesures

| Risque / Faille | Contre-mesure | Fichier(s) |
|-----------------|---------------|------------|
| Fuite mots de passe | `BCryptPasswordEncoder`, `PasswordEncoder` [SecurityConfig] | sécurité backend |
| Tokens reset réutilisables | Suppression ancienne entrée + TTL (`PasswordResetTokenRepository.deleteByUser`, `expiresAt`) | PasswordResetService |
| Enumeration comptes via reset | `204 No Content` sans message spécifique | `AuthController.forgotPassword` |
| Token expiré | Vérification `expiresAt` + suppression token | `resetPassword` |
| JWT falsifié | Signature HS256 + `JWTAuthenticationFilter` | `JWTService`, `JWTAuthenticationFilter` |
| JWT expiré | Détection expiration (claims) + suppression cookie | `JWTAuthenticationFilter` |
| CSRF via fetch cross-site | Cookie JWT HttpOnly + CORS restrictif (`cors.allowed-origin`), `withCredentials` uniquement pour origines whitelistees | `SecurityConfig` |
| Rôle insuffisant | `requestMatchers().hasAnyRole(...)`, `@PreAuthorize` | `SecurityConfig`, controllers |
| Injections SQL | Repositories Spring Data + DTO typés (pas de SQL raw) | Repositories |
| Inputs invalides | Bean Validation (`@Valid`, `@Email`, `@NotBlank`) | contrôleurs & DTOs |
| XSS côté client | Validators front, binding Angular (escaping par défaut) | composants Angular |
| Upload non authentifié | `Cloudinary signature` nécessite `/auth/forgot-password` authenticated (non dans ce flux) ; `upload` direct utilise signature signée backend | `CloudinaryService` |
| Session fixation | JWT dans cookie, stateless => nouvelle authent = nouveau token | `AuthService.login`, `JWTService` |

---

## 6. Ressources complémentaires
- `docs/cloudinary-upload.md` : flux fichiers.
- `docs/password-reset-flow.md` : process complet mot de passe oublié.
- `docs/route-guards.md`, `docs/auth-http-interceptor.md` : comportement Angular complémentaire.
- `src/main/resources/static/openapi.yaml` : contrat API complet (security + validations).

---

## 7. Actions futures possibles
- CSRF token double submit (en plus du cookie) pour endpoints sensibles si l’app doit accepter d’autres origines.
- Rate limiting sur `/auth/forgot-password` et `/auth/reset-password` (ex : bucket). Actuellement absent.
- 2FA optionnel sur reset (par ex. code par SMS).
- Logs centralisés & alertes sur `ExternalServiceException` (échecs envoi email).
