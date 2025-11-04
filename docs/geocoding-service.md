# Geocoding Service

## Purpose
Encapsulates calls to the backend `/geocoding/reverse` proxy (which lui-même contacte Nominatim) pour traduire des coordonnées GPS en fragments d'adresse (ville, pays, continent) tout en respectant les limitations de l'API publique.

## Endpoint usage
- Base URL côté front : `${environment.apiUrl}/geocoding/reverse`.
- Le backend enrichit automatiquement la requête Nominatim avec `format=jsonv2`, `lat`, `lon`, `addressdetails=1`, `zoom=10`, `accept-language`.
- Les en-têtes `User-Agent` et `From` sont ajoutés côté serveur pour respecter la politique Nominatim.

## Implementation rapide
- Service Angular : `travel-blog/src/app/core/services/geocoding.service.ts`.
- Chaque appel crée un `HttpParams` avec `lat` et `lon`, puis interroge le proxy backend.
- La méthode retourne un objet simple `{ latitude, longitude, city, country, continent }` sans logique de cache.

## Integration points
- `CreateStepFormComponent` and `CreateDiaryModalComponent` request geocoding after the map modal confirms a selection.
- Errors are surfaced to the UI so the user can proceed even if Nominatim is unreachable.
