import { Theme } from '@model/theme.model';
import { Media } from '@model/media.model';

export interface Article {
  id: number;
  title: string;
  content: string;
  updatedAt: string;
  slug: string;
  author: string;
  category?: string;
  themeId?: number | null;
  userId?: number | null;
  themes?: Theme[];
  coverUrl?: string | null;
  thumbnailUrl?: string | null;
  medias?: Media[];
}
