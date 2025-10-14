## Configuration des tests unitaires et E2E

Ce projet combine deux environnements de test TypeScript distincts : Jasmine/Karma pour les tests unitaires Angular et Mocha/Chai (via Cypress) pour les tests end‑to‑end. Mélanger ces deux mondes dans le même ensemble de fichiers peut provoquer des conflits de types dans l’éditeur, en particulier autour de la fonction globale `expect`.

### Difficulté rencontrée

Les fichiers `*.spec.ts` placés sous `src/` sont destinés à Karma/Jasmine. Lorsque TypeScript les analyse en même temps que les fichiers Cypress, il leur applique par erreur les types de Chai. Dans ce contexte, `expect(...)` est vu comme un `Chai.Assertion`, et les matchers Jasmine comme `toBeTruthy` ne sont plus proposés, ce qui déclenche l’erreur `TS2339: Property 'toBeTruthy' does not exist on type 'Assertion'`.

### Séparation des configurations

- **Jasmine/Karma**  
  - Fichiers cibles : `src/**/*.spec.ts`  
  - Configuration : `tsconfig.spec.json`  
    - Référence les types Jasmine (`"types": ["jasmine"]`)  
    - Inclut uniquement les specs Angular (`"include": ["src/**/*.spec.ts", "src/**/*.d.ts"]`)

- **Cypress (Mocha/Chai)**  
  - Fichiers cibles : `cypress/**/*.ts`  
  - Configuration : `tsconfig.cypress.json`  
    - Étend `tsconfig.json` mais force l’usage exclusif des types Cypress (`"types": ["cypress"]`)  
    - Restreint l’inclusion aux fichiers du dossier `cypress/` (`"include": ["cypress/**/*.ts"]`)

- **tsconfig.json**  
  - Sert de point d’entrée et délègue aux configurations spécialisées grâce au bloc `"references"` : `tsconfig.app.json`, `tsconfig.spec.json`, `tsconfig.cypress.json`.  
  - Cette séparation évite que l’éditeur essaie de compiler tous les fichiers avec une seule configuration et mélange les types globaux.

### Bonnes pratiques

- Laisser les tests unitaires Angular sous `src/` et les tests Cypress dans `cypress/`.  
- Redémarrer le serveur TypeScript de l’éditeur (`TypeScript: Restart TS server`) après modification des fichiers `tsconfig*.json`.  
- Utiliser les matchers adaptés à l’environnement : `toBeTruthy` (Jasmine) pour `src/**/*.spec.ts`, `expect(...).to.be.true` (Chai) pour `cypress/**/*.cy.ts`.

Grâce à cette organisation, chaque suite de tests conserve son propre ensemble de types et l’éditeur cesse de signaler de faux positifs sur les matchers Jasmine.
