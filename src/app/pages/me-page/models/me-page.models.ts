import { TravelDiary } from '@model/travel-diary.model';
import { Step } from '@model/step.model';
import { Media } from '@model/media.model';

export type SectionId = 'info' | 'diaries' | 'articles' | 'users';

export interface SectionItem {
  id: SectionId;
  label: string;
  adminOnly?: boolean;
}

export interface ArticleDraft {
  title: string;
  author: string;
  category: string;
  content: string;
  coverUrl: string | null;
}

export interface ArticleItem extends ArticleDraft {
  id: number;
  publishedAt: string;
  slug?: string;
  userId?: number | null;
  medias?: Media[];
}

export interface ProfileFormState {
  pseudo: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export type NormalizedDiary = TravelDiary & { steps: Step[] };

export const INITIAL_ARTICLE_DRAFT: ArticleDraft = {
  title: '',
  author: '',
  category: '',
  content: '',
  coverUrl: null,
};

export const INITIAL_PROFILE_FORM: ProfileFormState = {
  pseudo: '',
  email: '',
  password: '',
  confirmPassword: '',
};
