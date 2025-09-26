export type SearchResultItemType = 'diary' | 'step';

export interface SearchResultItem {
  id: number;
  type: SearchResultItemType;
  label: string;
  description?: string | null;
  diaryId?: number;
  diaryTitle?: string | null;
  thumbnailUrl?: string | null;
}
