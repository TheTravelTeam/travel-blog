# Geocoding Service

## Purpose
Encapsulates calls to the public Nominatim API to translate GPS coordinates into human-readable address fragments (city, country, continent).

## Endpoint usage
- Base URL: `https://nominatim.openstreetmap.org/reverse`
- Query params used: `format=jsonv2`, `lat`, `lon`, `addressdetails=1`, `zoom=10`.
- Responses are localised with header `Accept-Language: fr`.

## Caching strategy
- Each lookup key is `lat_lon` rounded to 6 decimals.
- Successful responses are cached in-memory to prevent rate-limit issues when users reopen the same coordinates.
- Consumers should expect cold requests to return an `Observable` that resolves once; subsequent subscribers receive the cached value via `shareReplay`.

## Integration points
- `CreateStepFormComponent` and `CreateDiaryModalComponent` request geocoding after the map modal confirms a selection.
- Errors are surfaced to the UI so the user can proceed even if Nominatim is unreachable.
