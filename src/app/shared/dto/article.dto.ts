export interface ArticleDto {
  id: number;
  title: string;
  content: string;
  updatedAt: string;
  slug: string;
  userId: number;
  pseudo: string;
  themeId?: number | null;
  themeName?: string | null;
  category?: string | null;
  coverUrl?: string | null;
  thumbnailUrl?: string | null;
  theme?: {
    id: number;
    name: string;
    updatedAt?: string;
  } | null;
  themes?: { id: number; name: string; updatedAt?: string }[] | null;
}

export interface UpsertArticleDto {
  title: string;
  content: string;
  userId: number;
  themeIds: number[];
}
