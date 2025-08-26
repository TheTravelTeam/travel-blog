import { CoverMediaDto } from './cover-media.dto';

export interface CreateDiaryDto {
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  coverMedia: CoverMediaDto;
}
