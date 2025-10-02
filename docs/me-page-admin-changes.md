# Administration "Me" Page Updates

## 2025-10-02
- `src/app/pages/me-page/me-page.component.ts` : refonte majeure du conteneur profil, migration complète vers les signaux Angular, découpage des sections et gestion renforcée des workflows articles/profil.
- `src/app/pages/me-page/me-page.component.html` : restructuration du gabarit avec `@if/@switch` pour les états, navigation latérale accessible et intégration du nouvel onglet administrateur.
- `src/app/pages/me-page/me-page.component.scss` : nettoyage des styles historiques, rationalisation des règles responsive et harmonisation avec le design system interne.
- `src/app/pages/me-page/models/me-page.models.ts` : ajustement du type `SectionId` et des formulaires initiaux pour gérer la nouvelle section "users".
- `src/app/pages/me-page/components/admin-users-section/` : création du composant autonome (template, styles, logique) pour rechercher des utilisateurs, modifier leur rôle admin et piloter la modération des carnets (statut, confidentialité).
- `src/app/pages/me-page/me-page.component.spec.ts` : mise à jour du banc de tests pour couvrir la nouvelle section admin et les appels réseau additionnels.
