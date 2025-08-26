import { Comment } from './comment';
import { Media } from './media.model';

export interface Step {
  id: number;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  medias: Media[];
  country: string;
  startDate: Date;
  isEditing: boolean;
  comments?: Comment[];
  likes: number;
}
