# Route-Driven Signal Effects

This note documents how routing information flows through the diary and travel filter pages after removing the deprecated `allowSignalWrites` option from Angular `effect()` calls.

## Diary Page
- `src/app/pages/world-map-page/diary-page.component.ts` subscribes to the `currentDiary` signal exposed by its page state.
- When the selected diary changes (for example, because navigation updates route parameters), the effect calls `resolveDiaryOwner()` to refresh ownership metadata before the view renders protected controls.
- The effect relies on Angular's default behavior, where signal writes are permitted without opt-in flags, so removing `{ allowSignalWrites: true }` does not change runtime behavior.

## Filter Page
- `src/app/pages/filter-page/filter-page.component.ts` evaluates the `filteredDiaries` signal inside an effect that is triggered every time route-driven filters mutate.
- The effect writes the filtered collection back into the shared state so other components can react without directly depending on the router.
- A companion effect watches `router.url` and collapses the travel panel whenever navigation returns to `/travels`, keeping the route and the panel layout synced.
- These effects also operate safely without the deprecated `allowSignalWrites` flag because Angular now allows signal writes inside effects by default.

## Why the Change Matters
- Angular 17+ issues warnings when `allowSignalWrites` is passed to `effect()` because signal writes are always enabled; keeping the flag would leave noisy console output without providing additional safety.
- Consolidating on the default behavior ensures the project stays compatible with future Angular releases while maintaining the existing routing logic.
