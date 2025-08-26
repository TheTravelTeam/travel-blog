import { Media } from './media.model';
import { Step } from './step.model';
import { User } from './user.model';

export interface TravelDiary {
  id: number;
  title: string;
  latitude: number;
  longitude: number;
  private: boolean;
  published: boolean;
  status: string;
  description: string;
  steps: Step[];
  user: User;
  medias: Media[];
  coverMedia: Media | null;
}
