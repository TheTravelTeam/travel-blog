export interface SearchResultDto {
  diaries?: SearchResultDiaryDto[];
  steps?: SearchResultStepDto[];
}

export interface SearchResultDiaryDto {
  id: number;
  title: string;
  description?: string | null;
  coverUrl?: string | null;
}

export interface SearchResultStepDto {
  id: number;
  title: string;
  diaryId: number;
  diaryTitle?: string | null;
  excerpt?: string | null;
}
