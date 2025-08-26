import { Media } from './media';
import { Step } from './step';
import { User } from './user';

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
