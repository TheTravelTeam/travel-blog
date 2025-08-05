import { Media } from './media';

export interface Step {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  medias: Media[];
}
