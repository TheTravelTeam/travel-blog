import { CoverMediaDto } from './coverMediaDto';

export interface CreateDiaryDto {
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  coverMedia: CoverMediaDto;
}
