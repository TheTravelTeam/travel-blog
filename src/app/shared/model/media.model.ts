export interface Media {
  createdAt: string;
  fileUrl: string;
  id: number;
  mediaType: string;
  status: string;
  updatedAt: string;
  publicId?: string | null;
  articleId?: number | null;
  travelDiaryId?: number | null;
  stepId?: number | null;
}
