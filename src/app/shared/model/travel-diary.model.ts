import { Media } from './media.model';
import { Step } from './step.model';
import { User } from './user.model';

/**
 * Modèle principal consommé par le front pour représenter un carnet de voyage.
 * Le backend expose un champ `media` unique pour la vignette ; le front s'appuie
 * dessus et tombe ensuite sur les médias d'étape le cas échéant.
 */
export interface TravelDiary {
  /** Identifiant numérique dans la base. */
  id: number;
  /** Titre court du carnet. */
  title: string;
  /** Coordonnées (utiles pour positionner le carnet sur la carte). */
  latitude: number;
  longitude: number;
  /** Indique si le carnet est privé / publié. */
  private: boolean;
  published: boolean;
  status: string;
  /** Texte long de description. */
  description: string;
  /** Liste normalisée des étapes. */
  steps: Step[];
  /** Auteur du carnet (objet) lorsque présent. */
  user: User;
  /** Média principal fourni par l'API (photo ou vidéo). */
  media: Media | null;
  /** Identifiant simple de l'auteur lorsque l'API ne renvoie pas l'objet complet. */
  userId?: number;
}
