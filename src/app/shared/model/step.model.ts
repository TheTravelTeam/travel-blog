import { Comment } from './comment';
import { Media } from './media.model';

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
  themeId?: number | null;
  travelDiaryId?: number | null;
  isEditing: boolean;
  comments?: Comment[];
  likes: number;
}
