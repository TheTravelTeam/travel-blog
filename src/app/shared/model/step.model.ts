import { Comment } from './comment';
import { Media } from './media.model';
import { Theme } from './theme.model';

/** Étape d'un carnet. Le backend expose désormais une liste unique `media`. */
export interface Step {
  id: number;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  media: Media[];
  country: string;
  city: string;
  continent: string;
  startDate: string | Date | null;
  endDate?: string | Date | null;
  status?: 'IN_PROGRESS' | 'COMPLETED' | null;
  /** Identifiants des thèmes associés (toujours présent, possiblement vide). */
  themeIds: number[];
  /** Thèmes associés renvoyés par l'API. Peut être vide si aucun thème. */
  themes: Theme[];
  themeId?: number | null;
  travelDiaryId?: number | null;
  isEditing: boolean;
  comments?: Comment[];
  likes: number;
  /** Associations héritées d'anciennes réponses (conservées pour compat). */
  stepThemes?: { id?: number | null; theme?: Theme | null }[];
}
