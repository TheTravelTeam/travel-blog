# Signaux Angular dans `MePageComponent`

## Pourquoi des signaux ?
Les signaux introduits avec Angular 16 offrent un modèle réactif léger, sans abonnement manuel. Ils stockent un état *mutable* et notifie automatiquement le template (ou d'autres signaux) dès qu'on appelle `set`, `update` ou `mutate`.

## Les trois familles utilisées
- **`signal()`** : état source. Exemple `isLoading` ou `articleDraft` qui conservent la donnée brute.
- **`computed()`** : dérivés mémorisés. `userRoleLabel` observe `isAdmin` et ne se recalcule qu'en cas de changement.
- **`effect()`** : effets secondaires. Dans `ngOnInit`, l'effet trace les rôles en console à chaque mise à jour de `roleBadges`.

## Cycle dans `MePageComponent`
1. `loadProfile()` alimente `profile` et `diaries` via `set`.
2. Les `computed` (`sections`, `roleBadges`, etc.) réévaluent automatiquement le nouveau modèle.
3. Le template consomme directement `signal()` ou `computed()` via `()`, ce qui déclenche la réactivité sans `async` pipe.
4. Les actions utilisateur appellent `setActiveSection`, `onSearch`, `updateDraft`… qui propagent instantanément les changements.

## Bonnes pratiques clés
- Grouper l'état mutable dans des objets simples (ex. `ArticleDraft`) pour conserver la lisibilité.
- Préférer `update` pour maintenir l'immuabilité et simplifier la détection de changements.
- Isoler les effets secondaires (`effect`) : logging, persistance, accès navigateur.
- Conserver `Subject` / `Observable` pour les flux réseau puis pousser le résultat dans un `signal` pour la vue.
