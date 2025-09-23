# Fonctionnalités ajoutées et mises à jour

- Création d’un carnet + première étape depuis plusieurs points d’entrée.
- Ouverture automatique de la modale de création lors d’une redirection depuis `/me`.
- Édition d’un carnet via la même modale, avec champs pré‑remplis et sans impacter les étapes.
- Boutons d’action cohérents sur `/me` et `/travels` pour créer/modifier/supprimer des carnets.
- Alimentation des statuts/visibilité d’un carnet (Privé, Publié, Commentaires autorisés, Statut du voyage).

## Parcours principaux

- Créer un carnet (depuis `/me`)
  1. Bouton “Créer un carnet” → redirection vers `/travels/users/{userId}`.
  2. Ouverture automatique de la modale en mode création.
  3. Étape “Carnet”, puis “Étape”. Soumission → POST `/travel-diaries` puis POST `/steps`.

- Modifier un carnet (depuis `/me` ou `/travels`)
  1. Bouton “Modifier” → ouverture directe de la modale en mode édition.
  2. Uniquement les champs “Carnet” sont visibles et soumis.
  3. Soumission → PUT `/travel-diaries/{id}` (UpdateTravelDiaryDTO scalaires).

- Création d’une étape sur la carte
  - Clic sur la carte (mode step activé) → POST `/steps` avec `travelDiaryId`, coordonnées et statut.

