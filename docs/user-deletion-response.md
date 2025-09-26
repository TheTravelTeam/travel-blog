# Gestion de la reponse DELETE /users/{id}

## Probleme
L'API renvoie une chaine de caracteres confirmant la suppression (`"Utilisateur supprime avec succes."`). Angular tentait de parser cette charge utile en JSON puisque le type cible etait `Observable<void>`, ce qui provoquait l'erreur `Http failure during parsing` dans le navigateur.

## Resolution
- `UserService.deleteUser` envoie maintenant la requete avec `responseType: 'text'`.
- Le flux convertit explicitement la reponse en `void` (`map(() => void 0)`), ce qui evite toute tentative de parsing.

## Resultat
- Les suppressions aboutissent sans erreur de parsing.
- Les composants consommateurs continuent de travailler avec un observable qui complete simplement.

## Bonnes pratiques
- Aligner le `responseType` Angular sur le format renvoye par l'API (texte, JSON, blob...).
- Eventuellement normaliser l'API pour renvoyer un statut 204 si aucun contenu n'est necessaire, supprimant le besoin de ce contournement.
