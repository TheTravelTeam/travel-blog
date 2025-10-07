# Page "Me" (Profil)

## Routing
- La route `/me` est declaree dans `src/app/app.routes.ts` et pointe vers `MePageComponent`.
- Le composant est standalone et importe tous ses modules (Atom, Molecule, Forms) pour limiter les dependances globales.

## Structure generale (`me-page.component.ts` / `.html`)
- Les signaux gerent tout l'etat de la page : profil, carnets, articles, utilisateurs administres, et etats de chargement/erreur. Voir `docs/SIGNALS.md` pour la strategie reactive.
- Le template oscille entre trois etats (`chargement`, `erreur`, `contenu`) puis affiche un layout trois colonnes : navigation laterale, separateur (`app-divider`) et contenu dynamique.
- Les sections disponibles sont calculees via `sections` (computed). L'onglet *Gestion des utilisateurs* n'apparait que si `isAdmin()` renvoie `true`.
- Les interfaces/types utilises par la page sont centralises dans `src/app/pages/me-page/models/me-page.models.ts` (sections, etats formulaires, drafts article, etc.) afin d'alleger le composant et de documenter clairement les formes de donnees exploitees lors des demos.

## Gestion du profil
- `profileForm` contient les champs editables; les inputs `app-text-input` sont relies via `[(ngModel)]` et `onProfileFieldChange` garde l'etat synchronise.
- `saveProfileChanges()` (fichier `me-page.component.ts` vers la ligne 405) s'appuie sur `UserService.updateUser` et verifie la coherence des mots de passe avant l'appel API.
- `deleteAccount()` declenche la suppression du compte courant via `UserService.deleteUser` et gere l'etat `profileDeleteSubmitting` pour bloquer l'UI.

## Carnets de voyage
- `diaries` stocke les carnets enrichis (`NormalizedDiary`) pour disposer rapidement des medias et etapes.
- `getDiaryCover`, `getDiaryCountry`, `getDiaryDescription` fournissent les metadonnees utilisees dans `me-page.component.html` pour alimenter `app-travel-diary-card`.
- `deleteDiary(diaryId)` effectue une suppression optimiste :
  1. creation d'un snapshot (`snapshotDiaries`) pour pouvoir revert.
  2. mise a jour immediate du signal `diaries` pour retirer la carte.
  3. appel API via `stepService.deleteDiary` (voir `docs/data-layer-updates.md`).
  4. en cas d'erreur, restauration du snapshot et message d'erreur dans `diariesError` (affiche dans la section).
- `deleteManagedDiary(userId, diaryId)` applique le meme schema pour les carnets administres, en synchronisant les deux signaux (`managedUsers`, `selectedManagedUser`) avant d'appeler l'API.

## Gestion des articles
- `ArticleService` alimente la section : `loadArticles()` convertit les DTO en `ArticleItem` prêts pour l'éditeur sans traitement supplémentaire.
- Les signaux `articleEditorView`, `articleFormMode`, `articleDraft`, `articleFormSubmitting` orchestrent la phase creation/edition.
- `submitArticle()` (vers la ligne 650) choisit automatiquement entre `createArticle` et `updateArticle` selon `editingArticleId()` et reinitialise le draft via `resetArticleForm()`.

## Administration des utilisateurs
- `loadManagedUsers()` recupere la liste complete via `UserService.getAllUsers`; un flag `managedUsersLoaded` evite les doubles requetes.
- `toggleAdmin(userId)` declenche `UserService.setAdminRole` et remplace l'entree localement pour garder les signaux en phase.
- `removeManagedUser(userId)` appelle `UserService.deleteUser`; l'etat `managedUserAction` permet de desactiver les boutons vises pendant l'appel.
- `onSelectManagedUser` ouvre le panneau detaille, recharge le profil cible et met en cache le resultat pour un affichage instantane.

## Responsivite
- Les gabarits mobiles / tablettes utilisent les signaux `isMobile`, `isMobileOrTablet` exposes par `BreakpointService`.
- Les classes CSS `me-page--compact` et `me-page__aside-divider` ajustent la densite et basculent le divider en horizontal lorsque l'ecran retrecit.

- `me-page.component.spec.ts` utilise `provideHttpClient(withInterceptorsFromDi())` + `provideHttpClientTesting()` pour simuler la requête `GET /articles` déclenchée à l'initialisation.
- `HttpTestingController` est injecte pour *flusher* l'appel réseau et garantir qu'aucun appel n'est oublie (`httpMock.verify()` en `afterEach`).
- Les tests continuent de verifier l'initialisation des signaux, la generation des sections selon le role et les interactions principales (toggle admin, suppression, changement d'onglet).
