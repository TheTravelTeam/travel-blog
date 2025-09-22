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
  startDate: Date;
  isEditing: boolean;
  comments?: Comment[];
  likes: number;
}
