export interface UpdateDiaryDTO {
  title: string;
  description: string;
  isPrivate: boolean | undefined;
  isPublished: boolean | undefined;
  status: string | undefined;
  canComment: boolean | undefined;
}
