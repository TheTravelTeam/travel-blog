import { TravelDiary } from '@model/travel-diary.model';

/**
 * Modèle applicatif utilisé dans l'UI après normalisation des données provenant du DTO.
 */
export interface UserProfile {
  /** Identifiant interne de l'utilisateur. */
  id: number;
  /** Nom complet affiché dans les écrans (ex. `Jean Dupont`). */
  firstName?: string;
  /** Nom complet affiché dans les écrans (ex. `Jean Dupont`). */
  lastName?: string;
  /** Pseudo unique côté produit (`jean.dp`). */
  pseudo: string;
  /** Courriel principal ; peut être absent si non communiqué. */
  email?: string;
  /** Biographie ou description libre publiée dans les carnets. */
  biography?: string | null;
  /** Illustration du profil, typiquement une URL vers un asset. */
  avatar?: string | null;
  /** Statut métier du compte (actif, suspendu...). */
  status?: string | null;
  /** Indique si le compte est exploitable côté front. */
  enabled?: boolean;
  /** Rôles normalisés (sans préfixe `ROLE_`). */
  roles: string[];
  /** Date de création du profil au format ISO8601. */
  createdAt?: string;
  /** Date de dernière mise à jour du profil. */
  updatedAt?: string;
  /** CArnets de voyages. */
  travelDiaries?: TravelDiary[];
}
