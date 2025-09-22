import { TravelDiary } from '@model/travel-diary.model';

/**
 * Structure brute renvoyée par l'API pour décrire un profil utilisateur.
 * Les champs optionnels reflètent fidèlement la présence potentielle de `null` côté backend.
 */
export interface UserProfileDto {
  /** Identifiant unique du profil dans la base de données. */
  id: number;
  /** Pseudo destiné aux interactions sociales / URL. */
  pseudo: string;
  /** Pseudo destiné aux interactions sociales / URL. */
  firstName: string;
  /** Pseudo destiné aux interactions sociales / URL. */
  lastName: string;
  /** Adresse e-mail principale, si fournie. */
  email?: string;
  /** Texte libre pour présenter l'utilisateur dans son espace public. */
  biography?: string | null;
  /** URL de l'avatar ; peut être `null` si aucun visuel n'est défini. */
  avatar?: string | null;
  /** Statut applicatif (actif, suspendu...) transmis par le backend. */
  status?: string | null;
  /** Indique si le compte est activé côté serveur. */
  enabled?: boolean;
  /** Liste brute des rôles (souvent préfixés par `ROLE_`). */
  roles?: string[];
  /** Timestamp ISO de création du profil. */
  createdAt?: string;
  /** Timestamp ISO de dernière mise à jour, si disponible. */
  updatedAt?: string;
  /** CArnets de voyages. */
  travelDiaries?: TravelDiary[];
}
