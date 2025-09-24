# Location Picker Modal

## Overview
- Modal component: `src/app/components/Organisms/location-picker-modal/location-picker-modal.component.*`.
- Embeds a Leaflet map to capture a single latitude/longitude.
- Shared between the standalone step form and the diary creation wizard.

## Interaction flow
1. **Initial centre**: defaults to Paris (`48.8566, 2.3522`) unless `initialCoordinates` are provided.
2. **Marker state**: a single marker is maintained; every new click removes the old marker and drops the new one.
3. **Geolocation**: when available, the browser position recentres the map, drops both the selection marker and a blue "you are here" indicator.
4. **Confirmation**: the `confirm` output emits `{ lat, lng }`; `hasSelection` prevents validation without a marker.
5. **Cleanup**: `ngOnDestroy` tears down the Leaflet instance to prevent leaks when the modal closes.

## Technical notes
- Uses a custom SVG pin stored at `public/icon/location-pin.svg`.
- `setTimeout(() => initMap(), 0)` avoids Angular's `ExpressionChangedAfterItHasBeenCheckedError` by deferring map creation.
- `setTimeout(() => map.invalidateSize(), 0)` ensures Leaflet recalculates tile sizes once the modal is visible.
- No reliance on global Leaflet assets beyond `L.icon`; CSS styling applies only to the user position.
