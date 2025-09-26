# Top Bar Diaries Navigation

## Overview
- The top bar resolves the connected user via `UserService.currentUserId()`.
- The "Carnet de voyage" link is only rendered when the user id is available.
- Clicking the link routes to `/travels/users/{id}`, which reuses the common media helpers.

## Implementation Notes
- `TopBarComponent` exposes `currentUserId` and `canDisplayDiariesLink` (see `src/app/components/Organisms/Top-bar`).
- `MyTravelsPageComponent` loads the target user’s diaries (route `:id` or connected user) and leverages `TravelMapStateService.getDiaryCoverUrl` in the template.
- The link behaviour aligns `/me`, `/travels/users/:id`, and `/travels/:id` thanks to the shared media logic.
