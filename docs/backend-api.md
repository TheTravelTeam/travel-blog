# Travel Blog API - Reference backend

## Apercu rapide
- **Stack**: Spring Boot 3.4, Java 21, Spring Data JPA, Spring Security, Lombok.
- **Persistence**: MySQL (profil par defaut), H2 pour les tests; scripts de seeds dans `src/main/resources/import.sql`.
- **Authentification**: JWT signe, stocke dans un cookie `jwt` httpOnly valable 1 h.
- **Organisation**: chaque domaine met ses DTO, mapper, service, repository et controller dans un package dedie sous `com.wcs.travel_blog`.

## Authentification et securite
- Filtre `JWTAuthenticationFilter` qui extrait le token depuis le cookie `jwt` et peuple le `SecurityContext`.
- `SecurityConfig` active CORS (origines configurees via `cors.allowed-origin`) et desactive le stockage de session (stateless).
- Les routes `/auth/**` sont publiques; le matcher `/**` est actuellement configure en `permitAll`, ce qui rend l'ensemble des endpoints accessibles sans authentification effective. Les annotations `@PreAuthorize` restent en place pour les verifications de role mais requierent un contexte utilisateur charge par le JWT.
- Roles supportes: `ROLE_USER` par defaut, `ROLE_ADMIN` ajoute via `PATCH /users/{id}/roles`.

## Domaines et entites clefs
- **Utilisateur (`User`)**: email unique, pseudo, biographie, avatar, statut (`ACTIVE`, `INACTIVE`, `BLOCKED`), roles (`ROLE_USER`, `ROLE_ADMIN`). Relation `OneToMany` avec `TravelDiary`.
- **Carnet de voyage (`TravelDiary`)**: titre, description, publication, statut (`IN_PROGRESS`, `COMPLETED`), visibilite commentaire, localisation (latitude/longitude). Lie a un utilisateur, a un media de couverture et a une liste d'etapes.
- **Etape (`Step`)**: titre, description, dates, statut (`TravelStatus`), localisation (latitude/longitude, ville/pays/continent), rattachee a un carnet, des medias, des commentaires et des themes.
- **Article**: titre, contenu, slug automatique, auteur (`User`), liste de themes, timestamps.
- **Media**: URL, type (`PHOTO` ou `VIDEO`), visibilite, rattache au besoin a un carnet ou une etape.
- **Commentaire**: contenu, timestamps, statut (`APPROVED`, `PENDING`, `REJECTED`), rattache a une etape et un auteur.
- **Theme**: nom simple, relie aux articles et aux etapes via des tables d'association.

## Gestion des erreurs
- `ResourceNotFoundException` -> 404.
- `EmailAlreadyExistException` -> 409.
- `ForbiddenOperationException` -> 403.
- Autres exceptions -> 500 avec message generique.
- Les listes vides retournent souvent 204 No Content (`GET /steps`, `/medias`, `/travel-diaries`, etc.).

## Controleurs et routes

### AuthController (`/auth`)
| Methode | Chemin | Description | Corps attendu | Reponse | Securite |
| --- | --- | --- | --- | --- | --- |
| POST | `/register` | Inscription utilisateur avec roles par defaut (`ROLE_USER`). | `UserRegistrationDTO` (email, pseudo, password...). | 201 + `UserDTO`. | Public |
| POST | `/login` | Authentifie un utilisateur et renvoie un cookie `jwt`. | `UserLoginDTO` (email, password). | 200 + message "Connexion reussie" et cookie JWT. | Public |
| POST | `/logout` | Invalide le cookie `jwt`. | Aucun. | 204, cookie vide. | Public |

### UserController (`/users`)
| Methode | Chemin | Description | Corps attendu | Reponse | Securite |
| --- | --- | --- | --- | --- | --- |
| GET | `/` | Liste des utilisateurs. | - | 200 + `List<UserDTO>` ou 204. | Public (via SecurityConfig) |
| GET | `/{userId}` | Detail utilisateur + carnets. | - | 200 + `UserWithDiariesDTO` ou 404. | Public |
| GET | `/email?email=` | Recherche par email. | - | 200 + `UserWithDiariesDTO` ou 404. | `ROLE_ADMIN` requis. |
| GET | `/pseudo?pseudo=` | Recherche par pseudo. | - | 200 + `UserWithDiariesDTO` ou 404. | `ROLE_ADMIN` requis. |
| PUT | `/{userId}` | Mise a jour profil (pseudo, email, avatar, status, password...). | `UpsertUserDTO`. | 200 + `UserDTO` ou 404. | Utilisateur connecte partage (pas enforce cote security) |
| PATCH | `/{userId}/roles` | Activation/desactivation du role admin. | `UpdateUserRolesDTO` (`admin` boolean). | 200 + `UserDTO`. | `ROLE_ADMIN` |
| DELETE | `/{userId}` | Suppression d'un utilisateur. | - | 200 message succes. | Public (devrait etre protege) |

### TravelDiaryController (`/travel-diaries`)
| Methode | Chemin | Description | Corps attendu | Reponse | Securite |
| --- | --- | --- | --- | --- | --- |
| GET | `/` | Liste des carnets. | - | 200 + `List<TravelDiaryDTO>` ou 204. | Public |
| GET | `/{id}` | Detail d'un carnet. | - | 200 + `TravelDiaryDTO` ou 404. | Public |
| POST | `/` | Creation carnet (peut lier user, media de couverture, etapes). | `CreateTravelDiaryDTO`. | 201 + `TravelDiaryDTO`. | `ROLE_USER` ou `ROLE_ADMIN` (non enforce par matcher global) |
| PUT | `/{id}` | Mise a jour partielle d'un carnet (titre, statut, publication, medias, etapes). | `UpdateTravelDiaryDTO`. | 200 + `TravelDiaryDTO` ou 404. | `ROLE_USER/ADMIN` |
| DELETE | `/{id}` | Suppression d'un carnet. | - | 200 message succes. | `ROLE_USER/ADMIN` |

### StepController (`/steps`)
| Methode | Chemin | Description | Corps attendu | Reponse | Securite |
| --- | --- | --- | --- | --- | --- |
| GET | `/` | Liste des etapes. | - | 200 + `List<StepDTO>` ou 204. | Public |
| GET | `/{stepId}` | Detail d'une etape. | - | 200 + `StepDTO`. | Public |
| POST | `/` | Creation d'etape (dates, statut, localisation, rattachements). | `StepDTO`. | 201 + `StepDTO`. | Public |
| PUT | `/{stepId}` | Mise a jour complete d'une etape. | `StepDTO`. | 200 + `StepDTO`. | Public |
| DELETE | `/{stepId}` | Suppression d'etape. | - | 204 ou 404. | Public |

### ArticleController (`/articles`)
| Methode | Chemin | Description | Corps attendu | Reponse | Securite |
| --- | --- | --- | --- | --- | --- |
| GET | `/` | Liste des articles. | - | 200 + `List<ArticleDTO>` ou 204. | Public |
| GET | `/{articleId}` | Detail article. | - | 200 + `ArticleDTO`. | Public |
| POST | `/` | Creation article (titre, contenu, themes). | `CreateArticleDTO` (userId obligatoire). | 201 + `ArticleDTO`. | Public |
| PUT | `/{articleId}` | Mise a jour article (titre -> regenere slug, contenu, auteur, themes). | `UpdateArticleDTO`. | 200 + `ArticleDTO`. | Public |
| DELETE | `/{articleId}` | Suppression article. | - | 204. | Public |

### ThemeController (`/themes`)
| Methode | Chemin | Description | Corps attendu | Reponse | Securite |
| --- | --- | --- | --- | --- | --- |
| POST | `/` | Creation d'un theme. | `ThemeDTO`. | 200 + `ThemeDTO`. | Public |
| GET | `/` | Liste des themes. | - | 200 + `List<ThemeDTO>` ou 404 si vide. | Public |
| GET | `/{id}` | Detail theme. | - | 200 + `ThemeDTO` ou 404. | Public |
| PUT | `/update/{id}` | Renommage theme. | `ThemeDTO`. | 200 + `ThemeDTO` ou 404. | Public |
| DELETE | `/{id}` | Suppression theme. | - | 204 ou 404. | Public |

### MediaController (`/medias`)
| Methode | Chemin | Description | Corps attendu | Reponse | Securite |
| --- | --- | --- | --- | --- | --- |
| GET | `/` | Liste des medias. | - | 200 + `List<MediaDTO>` ou 204. | Public |
| GET | `/{id}` | Detail media. | - | 200 + `MediaDTO` ou 404. | Public |
| POST | `/` | Creation media (url, type, visibilite). | `CreateMediaDTO`. | 201 + `MediaDTO`. | Public |
| PUT | `/{id}` | Mise a jour media (url, type, visibilite, rattachements). | `UpdateMediaDTO`. | 200 + `MediaDTO` ou 404. | Public |
| DELETE | `/{id}` | Suppression media. | - | 200 message succes. | Public |
| GET | `/step/{stepId}` | Medias rattaches a une etape. | - | 200 + `List<MediaDTO>` ou 204. | Public |
| GET | `/travel-diary/{diaryId}` | Media rattache a un carnet. | - | 200 + `MediaDTO` ou 404. | Public |

### CommentController (`/comments`)
| Methode | Chemin | Description | Corps attendu | Reponse | Securite |
| --- | --- | --- | --- | --- | --- |
| GET | `/` | Liste des commentaires avec filtres optionnels `stepId` ou `userId`. | - | 200 + `List<CommentDTO>` ou 204. | Public |
| GET | `/{id}` | Detail commentaire. | - | 200 + `CommentDTO` ou 404. | Public |
| POST | `/` | Creation commentaire pour une etape (statut par defaut `PENDING`). | `UpsertCommentDTO` (stepId, content). | 201 + `CommentDTO`. | Utilisateur connecte (id via JWT) |
| PUT | `/{id}` | Edition commentaire par son auteur. | `UpsertCommentDTO`. | 200 + `CommentDTO`. | Auteur connecte |
| DELETE | `/{id}` | Suppression commentaire (auteur ou admin). | - | 204. | Auteur ou `ROLE_ADMIN` |
| PATCH | `/{id}/status` | Moderation (`APPROVED`, `PENDING`, `REJECTED`). | `ModerateCommentDTO`. | 200 + `CommentDTO`. | `ROLE_ADMIN` |

## Comportements metier notables
- **Creation carnet**: peut initialiser media de couverture et lier une liste d'etapes existantes; verifie l'existence des identifiants fournis.
- **Mise a jour carnet**: supporte la suppression explicite des etapes (liste vide) et la reassociation de media/user.
- **Articles**: slug regene automatiquement si le titre change; tous les themes references doivent exister.
- **Medias**: permettent de lier/delier dynamiquement un carnet ou une etape (le `UpdateMediaDTO` avec identifiant `null` efface le lien).
- **Commentaires**: jeux de droits bases sur l'auteur; lever `ForbiddenOperationException` si l'utilisateur tente de modifier/supprimer sans droits.
- **Utilisateurs**: mise a jour encode les mots de passe et maintient le timestamp `updatedAt`; la mise a jour des roles recalcule l'ensemble complet (`ROLE_USER` toujours present).

## Points d'attention
- La configuration de securite actuelle autorise toutes les routes (`/**`) ce qui court-circuite l'exigence d'authentification; a corriger si un controle d'acces est attendu.
- Prevoir la mise en place d'un service de geocodage si le front en a besoin (non present dans la branche `dev`).
- Les DTO sont valides via `jakarta.validation`; en cas d'erreur, la reponse 400 contient `{"errors": {champ: message}}`.
