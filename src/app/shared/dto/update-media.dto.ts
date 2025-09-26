export interface UpdateMediaDto {
  fileUrl?: string;
  mediaType?: 'PHOTO' | 'VIDEO';
  publicId?: string;
  folder?: string;
  resourceType?: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  stepId?: number | null;
  travelDiaryId?: number | null;
  isVisible?: boolean;
}
