# Guide Cypress E2E – Travel Blog

## Objectif du document
Ce document centralise tout ce qu’il faut savoir pour exécuter, comprendre et étendre les tests end-to-end Cypress du projet Travel Blog : organisation des fichiers, configuration, commandes essentielles, scénarios existants et bonnes pratiques pour écrire de nouveaux tests.

---

## Présentation rapide de Cypress
Cypress est un framework de tests E2E et component orienté front-end. Il exécute le navigateur **réel** et synchronise automatiquement les actions (`cy.click`) et les assertions (`cy.should`). Les principaux bénéfices pour le projet :

- Pilotage de l’application Angular depuis un navigateur instrumenté.
- Contrôle précis des appels HTTP via `cy.intercept`, très utile ici pour stubber l’API voyage.
- Time-travel et capture automatique de screenshots/vidéos (lors de `cypress run`).

---

## Architecture des fichiers Cypress dans le repo

```
cypress/
├─ e2e/                      # Specs end-to-end (.cy.ts)
│  ├─ admin-management.cy.ts
│  ├─ auth-register-login.cy.ts
│  ├─ auth.cy.ts
│  ├─ spec.cy.ts
│  └─ user-journey.cy.ts
├─ fixtures/                 # Données statiques (JSON)
│  └─ example.json
├─ support/
│  ├─ commands.ts            # Point d’entrée pour les commandes custom (actuellement vide)
│  └─ e2e.ts                 # Chargé avant chaque spec E2E
└─ tsconfig.json             # Configuration TypeScript spécifique à Cypress
```

La configuration principale vit dans [`cypress.config.ts`](cypress.config.ts) :

- `baseUrl` fixé à `http://localhost:4200` (dev server Angular).
- Mode `e2e` activé par défaut.
- Bloc `component` déjà préparé (Angular + Webpack) si besoin de tests de composant (`*.cy.ts`).

---

## Pré-requis avant de lancer les tests

1. **Installer les dépendances** : `npm install`
2. **Lancer le serveur Angular** dans un terminal : `npm run start`
   - Par défaut sur `http://localhost:4200`.
3. **Optionnel : JSON server** (`npm run db`) si vous voulez tester un scénario qui ne stubbe pas toutes les routes. Les specs actuelles utilisent `cy.intercept` pour mocker intégralement les appels API, donc ce n’est pas indispensable.

> Astuce : lorsque vous utilisez `cy.intercept`, faites en sorte que l’URL corresponde à `proxy.conf.json` si vous laissez la proxy Angular.

---

## Lancer Cypress

| Objectif | Commande | Commentaires |
| --- | --- | --- |
| Ouvrir l’UI Cypress | `npm run cypress:open` | Mode interactif, parfait pour développer/debugger un test.
| Exécuter en headless | `npm run cypress:run` | Lance tous les tests dans Electron headless par défaut.
| **Nouveau** – alias CI | `npm run cypress:test` | Script ajouté pour offrir une commande unique (headless) prête à intégrer dans vos pipelines.

Le script `cypress:test` repose sur `cypress run` ; il respecte donc la configuration `cypress.config.ts` (navigateur Electron headless, screenshots/videos produits dans `cypress/screenshots` et `cypress/videos`).

---

## Commandes Cypress essentielles utilisées dans le projet

| Commande | Rôle dans nos specs | Exemple extrait |
| --- | --- | --- |
| `cy.visit(path)` | Charge une route de l’app Angular | `cy.visit('/login')` dans [`auth-register-login.cy.ts`](cypress/e2e/auth-register-login.cy.ts:41)
| `cy.viewport(w, h)` | Fixe les dimensions du viewport | `cy.viewport(1480, 720)` dans [`auth-register-login.cy.ts`](cypress/e2e/auth-register-login.cy.ts:24)
| `cy.intercept(method, url, handler)` | Stub/espionne les requêtes réseau | Multiples intercepts dans [`admin-management.cy.ts`](cypress/e2e/admin-management.cy.ts:52)
| `cy.wait(alias)` | Attend la complétion d’un appel intercepté ou d’un timer | `cy.wait('@login')` dans [`user-journey.cy.ts`](cypress/e2e/user-journey.cy.ts:414)
| `cy.get(selector)` | Cible un élément DOM | `cy.get('[data-test="login-email"]').find('input')` dans [`auth-register-login.cy.ts`](cypress/e2e/auth-register-login.cy.ts:55)
| `cy.contains(content)` | Cherche un élément par texte | `cy.contains('Carnet Explorer')` dans [`user-journey.cy.ts`](cypress/e2e/user-journey.cy.ts:450)
| `cy.click()` | Simule un clic | `cy.get('[data-test="admin-user-delete-2"]').click()` dans [`admin-management.cy.ts`](cypress/e2e/admin-management.cy.ts:175)
| `cy.type(text)` | Saisie dans un champ | `cy.type(password)` dans [`auth.cy.ts`](cypress/e2e/auth.cy.ts:35)
| `cy.url().should('include', part)` | Vérifie la navigation | `cy.url().should('include', '/travels')` dans [`auth-register-login.cy.ts`](cypress/e2e/auth-register-login.cy.ts:65)
| `cy.then(callback)` | Accès direct aux valeurs JS (ex : asserts custom) | Post-traitement d’IDs dans [`user-journey.cy.ts`](cypress/e2e/user-journey.cy.ts:434)

> Bonnes pratiques utilisées : sélecteurs `data-test` dédiés, chaînage `.find()` pour éviter les collisions, et alias (`.as('login')`) systématiques pour `cy.wait`.

---

## Scénarios de test existants

### `spec.cy.ts`
- Smoke test minimal : visite la page d’accueil (`/`) et vérifie la présence du claim principal.

### `auth-register-login.cy.ts`
- Parcours complet **inscription → connexion → déconnexion** pour un utilisateur.
- Stubs HTTP principaux : `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`.
- Vérifie les transitions de pages, la mise à jour de l’état authentifié ainsi que la visibilité des éléments topbar (`data-test="topbar-me"`, `topbar-logout`).

### `auth.cy.ts`
- Variante plus poussée créée pour enchaîner **inscription, connexion, consultation du compte**, navigation vers *Mes carnets* et création d’un carnet.
- Stubs supplémentaires sur `/api/travel-diaries` et `/api/users/*` pour simuler les ressources nécessaires à la création.
- Met l’accent sur le rechargement des données (`cy.wait('@meAuthed')`) quand on change d’écran.

### `admin-management.cy.ts`
- Parcours **administrateur** : connexion, promotion d’un utilisateur, gestion (status/visibilité) d’un carnet, suppression de carnet puis suppression d’utilisateur.
- Utilise un état interne (via `Map` et variables locales) pour simuler l’API admin et garder de la cohérence entre les requêtes PATCH/PUT/DELETE.
- Vérifie l’affichage des feedbacks UI (`data-test="admin-diaries-feedback"`).

### `user-journey.cy.ts`
- Scénario XXL couvrant le **cycle de vie complet d’un carnet** côté voyageur : connexion, création de carnet + étapes, édition, suppression d’étape, recherche depuis la topbar, navigation vers différents résultats.
- Stubs complexes pour `/api/travel-diaries`, `/api/steps`, `/api/search`, `/api/medias`, ainsi que `https://nominatim.openstreetmap.org/reverse*` (géocodage inverse).
- Manipule des IDs générés dynamiquement (`createdDiaryId`, `firstStepId`, `secondStepId`) et les réinjecte dans les assertions.

---

## Support et extensions
- [`cypress/support/commands.ts`](cypress/support/commands.ts) est prêt à accueillir vos commandes personnalisées (`Cypress.Commands.add`).
- [`cypress/support/e2e.ts`](cypress/support/e2e.ts) est exécuté avant chaque spec : importez-y vos commandes (`import './commands'`) ou configurez des hooks globaux.
- Les fixtures (`cypress/fixtures/*.json`) permettent de partager des résultats statiques entre specs (non utilisé pour l’instant).

---

## Écrire de nouveaux tests
1. Créez un fichier `cypress/e2e/mon-scenario.cy.ts`.
2. Structurez vos specs avec `describe/it`, et appliquez `cy.viewport` si vous ciblez une résolution spécifique.
3. Préférez les `data-test="..."` pour cibler les éléments.
4. Stubbez systématiquement les appels API instables ou non disponibles en local avec `cy.intercept`. Profitez des alias pour `cy.wait`.
5. Terminez chaque bloc par des assertions explicites (`should('eq', ...)`, `contains(...)`).

---

## Débogage et diagnostics
- **Time-travel** : dans l’UI Cypress (`cypress:open`), survolez chaque commande pour visualiser l’état DOM correspondant.
- **`cy.log()` / `console.log()`** : utiles pour inspecter les valeurs ou la réponse HTTP stubée.
- **Screenshots & vidéos** : générés automatiquement lors de `cypress run` (répertoires `cypress/screenshots`, `cypress/videos`).
- **Attentes explicites** : préférez `cy.wait('@alias')` plutôt que `cy.wait(…)` avec un nombre magique.

---

## Intégration CI/CD
- Utilisez `npm run cypress:test` dans vos pipelines.
- Pensez à démarrer l’app (`npm run start`) et, si besoin, à exposer un backend mock (JSON server ou intercept global) avant d’exécuter la commande.
- Partagez les artéfacts (`cypress/videos`, `cypress/screenshots`) pour faciliter le tri des échecs.

---

## Ressources utiles
- Documentation officielle : https://docs.cypress.io/
- Bonnes pratiques Cypress : https://docs.cypress.io/guides/references/best-practices
- API `cy.intercept` : https://docs.cypress.io/api/commands/intercept

---

_Note : mettez à jour ce guide à chaque ajout de spec ou modification d’architecture afin de garder la documentation alignée avec la suite de tests._
