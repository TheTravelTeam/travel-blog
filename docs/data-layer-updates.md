# Couche Donnees & Services

## Intercepteur HTTP
- `src/app/core/interceptors/auth.interceptor.ts` ajoute automatiquement le header `Authorization` (voir `docs/auth-http-interceptor.md`).
- `app.config.ts` enregistre l'intercepteur via `provideHttpClient(withInterceptors([...]))`.

## UserService
- `setAdminRole` consomme maintenant `PATCH /users/{id}/roles` (alignement backend) et retourne un `UserProfile` synchronise.
- `deleteUser` gere les reponses en texte (`responseType: 'text'`) pour eviter l'erreur de parsing lorsque l'API renvoie un message.
- JSDoc ajoute pour clarifier les parametres et le type de retour.

## ArticleService
- Introduit pour encapsuler la logique CRUD autour des articles (`getArticles`, `createArticle`, `updateArticle`, `deleteArticle`).
- `mapArticle`, `mapThemes`, `normalizeThemes` uniformisent les structures retournees par l'API (coercition des identifiants, fallback sur `theme` ou `themes`).
- Les modeles `ArticleDto`, `UpsertArticleDto` et `Article` decrivent les proprietes attendues cote front.

## ThemeService
- Nouvelle methode `getThemes()` avec retry cible sur l'erreur 404 puis mapping vers `Theme`.
- `ThemeDto` / `Theme` representent la structure minimale (id, nom, dates) utilisee dans l'UI.

## StepService
- `deleteDiary(diaryId: number)` supprime un carnet via `DELETE /travel-diaries/{id}` et convertit la reponse en `Observable<void>` (`map(() => void 0)`).
- Cette signature volontairement "vide" permet aux composants (`MePageComponent`) de pratiquer des mises a jour optimistes : on filtre le carnet localement, on invoque le service, et en cas d'erreur on restaure l'instantane (`snapshotDiaries`).
- A presenter en demo pour souligner la difference entre la suppression de *ses* carnets (`deleteDiary`) et celle des carnets administres (`deleteManagedDiary`) qui partagent la meme API mais manipulent des signaux distincts (`diaries` vs `managedUsers`).

## DTO / Modeles utilisateur
- `UserProfileDto` expose desormais un champ optionnel `password` pour les mises a jour liees au formulaire profil.
- `btn.model.ts` et `text-input.ts` refletent les entrees supplementaires (`htmlType`, `autocomplete`).

## Pages & Raccrochement
- `/me` (voir `docs/me-page-overview.md`) consomme ces services :
  - `UserService` pour le profil, les carnets et l'administration.
  - `ArticleService` pour la gestion de contenu.
  - `ThemeService` pour peupler le dropdown de themes.
- Les tests (`user.service.spec.ts`, `me-page.component.spec.ts`) valident les nouveaux endpoints et la serialisation.
