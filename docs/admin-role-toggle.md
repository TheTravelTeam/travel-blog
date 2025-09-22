# Admin Role Toggle API Update

## Contexte
Le front consommait auparavant l'URL `PATCH /users/{userId}/admin` pour activer le role administrateur. Du cote backend, l'endpoint expose est `PATCH /users/{userId}/roles`. Cette divergence entrainait une reponse CORS vide (statut 0) car aucun mapping ne repondait.

## Mise a jour effectuee
- Le service Angular `UserService.setAdminRole` cible maintenant `PATCH /users/{userId}/roles` et conserve le payload `{ admin: boolean }` attendu par `UpdateUserRolesDTO`.
- Le test unitaire `user.service.spec.ts` a ete ajuste pour valider ce nouvel endpoint.

## Impact fonctionnel
- L'administration peut a nouveau activer ou desactiver un role admin pour un utilisateur.
- Le succes de l'action depend du jeton JWT admin (voir `docs/auth-http-interceptor.md`).

## Exemple de requete
```http
PATCH /users/12/roles HTTP/1.1
Host: localhost:8080
Content-Type: application/json
Authorization: Bearer <token>

{
  "admin": true
}
```
