import { Media } from '@model/media.model';

export interface Article {
  id: number;
  title: string;
  content: string;
  updatedAt: string;
  slug: string;
  author: string;
  category?: string;
  userId?: number | null;
  coverUrl?: string | null;
  thumbnailUrl?: string | null;
  medias?: Media[];
}
