export interface UpdateDiaryDTO {
  title: string;
  description: string;
  isPrivate: boolean | undefined;
  canComment: boolean | undefined;
  startDate: string | null;
}
