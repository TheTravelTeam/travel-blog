# Step Location Flow

## Components involved
- `CreateStepFormComponent` (`src/app/components/Organisms/create-step-form/create-step-form.component.*`)
- `CreateDiaryModalComponent` (`src/app/components/Organisms/create-diary-modal/create-diary-modal.component.*`)
- `GeocodingService` (`src/app/core/services/geocoding.service.ts`)

## Functional behaviour
- The user clicks “Choisir sur la carte”. The modal returns `{ lat, lng }` on confirmation.
- Hidden form controls `latitude` and `longitude` are patched programmatically; they never appear in the UI.
- Nominatim reverse-geocoding runs after each selection to enrich `city`, `country`, and `continent` automatically.
- Validation prevents submission until valid coordinates are present; error banners surface failures.
- Summary badges display either `city, country` or the raw coordinates when no address exists.

## Technical details
- Geocoding responses are cached per coordinate pair (`lat_lon` with 6 decimals).
- Both components share the same UX helpers (`parseCoordinate`, `fetchStepLocationDetails`).
- Hidden inputs ensure standard Angular validation can run on the form group without exposing the fields.
- Modal reuse avoids duplicating Leaflet logic; the components only deal with state and service calls.
