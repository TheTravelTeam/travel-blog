import { CoverMediaDto } from './cover-media.dto';

/**
 * Payload utilisé lors de la création d'un carnet depuis le front.
 * Le champ `media` reprend la forme unique attendue par l'API.
 */
export interface CreateDiaryDto {
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  media: CoverMediaDto;
}
