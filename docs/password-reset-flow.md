## Flux de réinitialisation de mot de passe (Brevo)

Ce document explique le chemin complet entre le clic « mot de passe oublié » dans l’IHM et la finalisation de la réinitialisation côté backend, email Brevo inclus.

---

## 1. Vue d’ensemble 

1. L’utilisateur clique sur « Mot de passe oublié » depuis le formulaire de connexion (`LoginFormComponent`).
2. Il saisit son email dans `ForgotPasswordFormComponent` qui appelle `AuthService.requestPasswordReset(email)`.
3. Côté backend, `POST /auth/forgot-password` crée un jeton de réinitialisation via `PasswordResetService.requestPasswordReset`.
4. Le service envoie un email via `MailService` (Brevo) contenant un lien `https://<frontend>/reset-password?token=<...>`.
5. L’utilisateur clique sur le lien, saisit son nouveau mot de passe dans `ResetPasswordPageComponent` (front) qui appelle `AuthService.resetPassword(token, password)`.
6. Le backend (`POST /auth/reset-password`) valide le jeton, met à jour le mot de passe et invalide le jeton.

---

## 2. Front-end (Angular)

### 2.1 `LoginFormComponent`
- HTML (`login-form.component.html`) inclut un lien vers `/forgot-password`.
- `navigateToForgotPassword()` redirige l’utilisateur.

### 2.2 `ForgotPasswordFormComponent`
Fichier : `src/app/components/Organisms/forgot-password-form/forgot-password-form.component.ts`.

- Formulaire réactif (champ `email`).
- `onSubmit()` :
  - Valide et, si ok, appelle `AuthService.requestPasswordReset(email)`.
  - Affiche une `Toast` de succès ; en cas d’erreur, message via `extractErrorMessage`.

### 2.3 `AuthService.requestPasswordReset`
Fichier : `src/app/core/services/auth.service.ts`.

```ts
requestPasswordReset(email: string): Observable<void> {
  return this.http.post<void>(
    `${this.apiUrl}/forgot-password`,
    { email },
    { withCredentials: environment.useCredentials }
  );
}
```

- `apiUrl` = `${environment.apiUrl}/auth`.
- `withCredentials` selon l’environnement (CSRF/Cookies).

### 2.4 Réception du lien (`ResetPasswordPageComponent`)
- Page Angular (`/reset-password?token=...`).
- Formulaire nouveau mot de passe.
- `AuthService.resetPassword(token, password)` envoie `POST /auth/reset-password`.

```ts
resetPassword(token: string, password: string): Observable<void> {
  return this.http.post<void>(
    `${this.apiUrl}/reset-password`,
    { token, password },
    { withCredentials: environment.useCredentials }
  );
}
```

### 2.5 Synchronisation média (optionnel)
- Dans ce flux, il n’y a pas de média, uniquement formulaires et navigation.

---

## 3. Backend (Spring Boot)

### 3.1 `AuthController`
Fichier : `Travel-blog-API/.../auth/controller/AuthController.java`.

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `POST /auth/forgot-password` | `forgotPassword(ForgotPasswordRequestDTO)` | Toujours `204 No Content`. Ne divulgue pas si l’email existe. |
| `POST /auth/reset-password` | `resetPassword(PasswordResetRequestDTO)` | Vérifie le jeton et met à jour le mot de passe. |

Dependencies injectées : `PasswordResetService`.

### 3.2 `PasswordResetService`
Fichier : `.../auth/service/PasswordResetService.java`.

#### `requestPasswordReset(String email)`
1. Normalise l’email (`trim().toLowerCase()`).
2. `UserRepository.findByEmail(email)` : si aucun utilisateur, log et `return`.
3. Génère un token `UUID`, calcule `expiresAt` (`LocalDateTime.now().plusMinutes(tokenTtl)`).
4. Supprime les anciens tokens (`passwordResetTokenRepository.deleteByUser(user)`).
5. Sauvegarde `PasswordResetToken(token, user, expiresAt, createdAt)`.
6. Construit l’URL front `buildResetUrl(token)` -> `${frontendBaseUrl}/reset-password?token=...`.
7. Construit le message email `buildEmailBody(resetUrl)` (rappel TTL).
8. `mailService.send(user.getEmail(), SUBJECT, emailBody)` : en cas de `MailException`, log + `ExternalServiceException`.
   - L’annotation `@Transactional(noRollbackFor = ExternalServiceException.class)` garantit que le token reste en base même si l’envoi échoue.

#### `resetPassword(String token, String newPassword)`
1. Vérifie que le token est non vide.
2. `passwordResetTokenRepository.findByToken(token)` : sinon `InvalidPasswordResetTokenException`.
3. Vérifie la date `expiresAt`.
   - Si expiré : supprime le token et lève `ExpiredPasswordResetTokenException`.
4. Encode le mot de passe (`PasswordEncoder.encode(...)`).
5. Met à jour `user.setPassword(...)`, `user.setUpdatedAt(...)`, `userRepository.save(user)`.
6. Supprime les tokens existants pour ce user (`passwordResetTokenRepository.deleteByUser(user)`).

### 3.3 Repositories & Entités
- `UserRepository` : accès utilisateur.
- `PasswordResetTokenRepository` : persiste/détruit les tokens.
- `PasswordResetToken` : entité avec `token`, `user`, `expiresAt`, `createdAt`.

### 3.4 Envoi email (Brevo)
- `MailService.send(to, subject, body)` encapsule Brevo/SMTP (implémentation non montrée ici mais c’est le point d’intégration).
- Les logs différencient les échecs SMTP (`ExternalServiceException`) et les emails inconnus (`ResourceNotFoundException` n’est pas propagée).

---

## 4. Séquence complète détaillée

1. **Client** : `/login` → clique « Mot de passe oublié ». Redirection `/forgot-password`.
2. **`ForgotPasswordFormComponent`** : saisie email → `AuthService.requestPasswordReset`.
3. **Backend** `POST /auth/forgot-password` :
   - `PasswordResetService.requestPasswordReset`.
   - Sauvegarde token en base, envoie email via Brevo.
   - Répond `204` quelle que soit l’issue (pour ne pas révéler l’existence du compte).
4. **Email** : reçu via Brevo (`MailService`). Contient `reset-password?token=...`.
5. **Client** : ouvre le lien → `ResetPasswordPageComponent` affiche le formulaire.
6. **Soumission** : `AuthService.resetPassword(token, password)` → `POST /auth/reset-password`.
7. **Backend** : `PasswordResetService.resetPassword` valide token, met à jour le mot de passe, supprime le token.
8. **Client** :redirigé vers login (selon logique UI) avec confirmation.

---

## 5. Points d’attention

- **Confidentialité** : `/auth/forgot-password` retourne toujours `204`, logs informations mais ne révèle rien côté client.
- **TTL du token** : configurable (`auth.password-reset.token-ttl-minutes`, par défaut 30 min). Vérifié avant mise à jour du mot de passe.
- **Brevo** : tout échec d’envoi remonte `ExternalServiceException` mais la transaction est commit (token conservé pour usage manuel).
- **Front** : Les toasts informent l’utilisateur sans confirmer l’existence du compte.
- **Reset** : Une fois le mot de passe changé, tous les tokens sont supprimés pour éviter une réutilisation.

---

## 6. Fichiers clés

### Front
- `src/app/components/Organisms/login-form/` (navigation « mot de passe oublié »).
- `src/app/components/Organisms/forgot-password-form/forgot-password-form.component.*`.
- `src/app/pages/reset-password-page/` (formulaire de saisie du nouveau mot de passe).
- `src/app/core/services/auth.service.ts` (méthodes `requestPasswordReset` et `resetPassword`).

### Back
- `AuthController` (`POST /auth/forgot-password`, `POST /auth/reset-password`).
- `PasswordResetService`.
- `MailService` (intégration Brevo).
- `PasswordResetTokenRepository`, `PasswordResetToken`.
- `application.properties` (`app.frontend-base-url`, `auth.password-reset.token-ttl-minutes`).

---

## 7. Résumé

Ce flux assure :
- la sécurité (aucune indication sur l’existence du compte),
- une validité limitée dans le temps (TTL configurable),
- une expérience utilisateur simple (toasts informatifs, redirections),
- une intégration Brevo centralisée via `MailService`.

Pour toute modification, se référer aux fichiers listés ci-dessus et adapter à la fois la signature front/back si nécessaire.
