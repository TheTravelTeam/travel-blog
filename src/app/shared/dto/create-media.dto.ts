export interface CreateMediaDto {
  fileUrl: string;
  mediaType: 'PHOTO' | 'VIDEO';
  publicId?: string;
  stepId?: number | null;
  travelDiaryId?: number | null;
  articleId?: number | null;
  isVisible?: boolean;
}
