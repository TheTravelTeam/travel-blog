# Home Page Data & Navigation

Ce document détaille la façon dont la page d'accueil charge ses données dynamiques (carnets, articles) et comment la navigation est câblée depuis les cartes.

## Récupération des carnets

- **Fichier** : `src/app/pages/home-page/home-page.component.ts`
- **Service** : `StepService.getAllDiaries()` récupère tous les carnets.
- **Filtrage** : `isDiaryVisible` conserve les carnets publiés (`published` vrai), ceux dont le `status` n'est pas `DISABLED`, ou les carnets publics (`private === false`).
- **Limite** : on garde les 8 premiers (`slice(0, 8)`) pour remplir la grille 4×2.
- **Conversion** : chaque carnet est transformé en `VariantTripCard` via `mapDiaryToCard` (titre, description, auteur + image fallback `resolveDiaryImage`).
- **Auteurs manquants** : si seul l'identifiant est disponible, `fetchAuthorsForDisplayedDiaries` interroge `UserService.getUserProfile`, renseigne le `authorCache` puis met à jour la carte correspondante.
- **Stockage** : les cartes sont placées dans le signal `diaryCards`; des dérivés (`heroDiaryCards`, `gridDiaryCards`) alimentent le carrousel mobile et la grille desktop.

## Récupération des articles

- **Service** : `ArticleService.getArticles()` renvoie l'ensemble des articles.
- **Limite** : on conserve les 6 premiers (`slice(0, 6)`), transformés en `ArticlePreview` pour disposer d'un titre et d'une miniature.
- **Signal** : résultat stocké dans `articlePreviews`, utilisé par la section "Lieux à explorer".

## Navigation

- **Carnets** : `app-visual-trip-card` reçoit `routeCommands="['/travels', card.id]"`. En desktop comme mobile, cliquer redirige vers la carte (`/travels/:id`).
- **Mappemonde** : carte spéciale avec `routeCommands="['/travels']"` pour ouvrir la carte générale.
- **Articles** : les `app-card` sont cliquables (`isClickable=true`) et invoquent `openArticle(article.id)` pour aller sur `/articles/:articleId`.
- **Bouton CTA** : "Découvrez nos articles" déclenche `openArticlesListing()` → `/articles`.
- **Helpers** : les méthodes `navigateToDiary`, `openArticle`, `openArticlesListing` encapsulent les redirections via le service `Router` d'Angular.

## Responsiveness & UI

- La grille desktop (`tripCardsList--grid`) est une grille CSS limitée à 4 colonnes, max 8 items (2 lignes). Les cartes sont centrées avec `max-width` pour éviter de déborder.
- Le carrousel mobile s'appuie sur le mixin `horizontal-carousel` (cf. `docs/carousel-usage.md`).
- Chaque carte article utilise `app-chip` pour afficher le titre, reposer sur `Images/` si aucune vignette n'est fournie.

## Points d'attention

- `resolveDiaryImage` supporte uniquement le champ normalisé `step.media`. Si le backend renvoie encore `step.medias`, adapter avant intégration.
- Les noms d'auteur proviennent du cache ; la fonction `pickNameFromProfile` privilégie `pseudo`, puis la partie locale de l'e-mail.
- Si vous devez changer les limites (8 carnets, 6 articles), mettez à jour les `slice(...)` correspondants et vérifiez les styles.
- Pour ajouter des tracking/analytics, injectez `tap` dans les `pipe()` avant le `subscribe`.
