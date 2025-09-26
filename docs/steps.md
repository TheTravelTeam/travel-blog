# Gestion des étapes

## Vue d'ensemble
- La carte (`MapComponent`) charge les carnets et leurs étapes via `StepService`.
- `DiaryPageComponent` orchestre la création, l'édition et la suppression d'étapes.
- Les formulaires réutilisent `CreateStepFormComponent`, partagé entre la modale de carnet et la page carte.

## Flux principaux
### Création depuis la page carte
1. L'utilisateur clique sur **Créer une étape** si c'est le propriétaire du carnet.
2. `CreateStepFormComponent` émet un `StepFormResult` normalisé.
3. `DiaryPageComponent` appelle `StepService.addStepToTravel` puis recharge le carnet via `getDiaryWithSteps`.
4. Le step créé est automatiquement ouvert dans l'accordéon.

### Édition
1. Le bouton ✏️ d'un accordéon déclenche `onStepEditModeChange`.
2. Le formulaire est pré-rempli (`populateFromStep`) et la modale passe en mode édition.
3. `StepService.updateStep` enregistre la mise à jour, suivie d'un rafraîchissement du carnet.
4. L'accordéon se repositionne sur le step édité.

### Suppression
1. Le bouton 🗑️ supprime l'étape via `StepService.deleteStep`.
2. Le carnet est rechargé pour conserver l'ordre des étapes et le state est nettoyé.

## Validation & UX
- Les champs ville/pays/continent requièrent **2 caractères minimum** et affichent une aide inline.
- Latitude/longitude doivent être des nombres valides ; un message dédié apparaît en cas d'erreur.
- Les dates sont converties en `YYYY-MM-DD` avant d'être envoyées au back.

## API consommées
- `POST /steps` — Création (`CreateStepDto`).
- `PUT /steps/{id}` — Mise à jour d'une étape existante.
- `DELETE /steps/{id}` — Suppression.
- `GET /travel-diaries/{id}` — Récupération du carnet à jour après chaque mutation.

## Réutilisation côté carnet (modale)
- `CreateDiaryModalComponent` utilise la même logique de validation et les mêmes helpers (`getStepControlError`).
- Les messages d'erreur et contraintes sont alignés avec la page carte pour une UX homogène.

## Points d'extension
- `StepService` centralise les appels. Ajouter un nouveau champ côté back implique :
  1. Étendre `CreateStepDto` et `Step`.
  2. Mettre à jour `populateFromStep` et `handleSubmit` pour sérialiser le champ.
  3. Adapter les tests (`*.spec.ts`) qui valident les payloads et la pré-remplissage.

- L'accordéon expose `(isEditingChange)` pour brancher un autre formulaire si nécessaire.

## Tests
- `create-step-form.component.spec.ts` couvre la normalisation des dates, la pré-remplissage et la validation min-length.
- `step.service.spec.ts` assure la cohérence des endpoints POST/PUT/DELETE.
