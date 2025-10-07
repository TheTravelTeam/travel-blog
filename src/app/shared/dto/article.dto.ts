export interface ArticleDto {
  id: number;
  title: string;
  content: string;
  updatedAt: string;
  slug: string;
  userId: number;
  pseudo: string;
  category?: string | null;
  coverUrl?: string | null;
  thumbnailUrl?: string | null;
  medias?: {
    id: number;
    fileUrl: string;
    mediaType: string;
    publicId?: string | null;
    articleId?: number | null;
    status?: string | null;
    updatedAt?: string;
    createdAt?: string;
  }[] | null;
}

export interface UpsertArticleDto {
  title: string;
  content: string;
  userId: number;
  category?: string;
  coverUrl?: string;
  mediaIds?: number[];
}
