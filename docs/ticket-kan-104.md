# Ticket KAN-104 - Documentation des changements

## Fichiers modifies
- `src/app/app.config.ts` : enregistrement de `authInterceptor`.
- `src/app/app.routes.ts` : ajout de la route `/me`.
- `src/app/components/Atoms/Button/button.component.{ts,html}` : support du nouvel input `htmlType`.
- `src/app/components/Atoms/Divider/divider.component.{ts,scss}` : classes hote et responsivite.
- `src/app/components/Atoms/select/select.component.ts` : gestion clavier et synchronisation selection.
- `src/app/components/Atoms/text-input/text-input.component.{ts,html}` : input `autocomplete`, gestion mot de passe.
- `src/app/components/Molecules/Card-ready-to-use/travel-diary-card/*` : signaux breakpoint, comportements d'action.
- `src/app/core/services/user.service.{ts,spec.ts}` : endpoint `/roles`, delete texte, tests ajustes.
- `src/app/shared/dto/user-profile.dto.ts` : champ `password` optionnel.
- `src/app/shared/model/btn.model.ts` : ajout du champ `htmlType`.
- `src/app/shared/model/text-input.model.ts` : ajout `autocomplete`.

## Nouveaux fichiers
- `src/app/core/interceptors/auth.interceptor.ts` : interception du header Authorization (`docs/auth-http-interceptor.md`).
- `src/app/core/services/article.service.ts` + DTO/Model (`src/app/shared/dto/article.dto.ts`, `src/app/shared/model/article.model.ts`).
- `src/app/core/services/theme.service.ts` + DTO/Model (`src/app/shared/dto/theme.dto.ts`, `src/app/shared/model/theme.model.ts`).
- `src/app/pages/me-page/*` : page profil avec panneaux profils/carnets/articles/utilisateurs (`docs/me-page-overview.md`).
- `docs/admin-role-toggle.md` : documentation endpoint role admin.
- `docs/auth-http-interceptor.md` : fonctionnement de l'intercepteur.
- `docs/user-deletion-response.md` : gestion de la reponse texte sur DELETE utilisateur.
- `docs/me-page-overview.md` : details de la page `/me`.
- `docs/ui-components.md` : synthese des composants UI touches.
- `docs/data-layer-updates.md` : recap des services/dto.
- `docs/SIGNALS.md` : fonctionnement des signaux dans `MePageComponent`.
- `AGENTS.md` : rappel des conventions repo.

## Repertoires exclus
- `maquettes/` contient uniquement des captures PNG de reference UX (pas de documentation supplementaire requise).

## Ressources associees
- Les tests mis a jour couvrent les nouveaux endpoints (`user.service.spec.ts`) et la logique du composant profil (`me-page.component.spec.ts`).
- Les services `ArticleService` et `ThemeService` sont exploites par la page `/me` pour fournir les donnees necessaires.

Pour une analyse detaillee, consulter :
- `docs/me-page-overview.md`
- `docs/ui-components.md`
- `docs/data-layer-updates.md`
- `docs/admin-role-toggle.md`
- `docs/auth-http-interceptor.md`
- `docs/user-deletion-response.md`
