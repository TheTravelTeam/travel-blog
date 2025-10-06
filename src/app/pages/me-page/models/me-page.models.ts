import { TravelDiary } from '@model/travel-diary.model';
import { Step } from '@model/step.model';
import { Theme } from '@model/theme.model';
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
  themeId: number | null;
  coverUrl: string | null;
}

export interface ArticleItem extends ArticleDraft {
  id: number;
  publishedAt: string;
  slug?: string;
  themes?: Theme[];
  userId?: number | null;
  medias?: Media[];
}

export interface ProfileFormState {
  firstName?: string;
  lastName?: string;
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
  themeId: null,
  coverUrl: null,
};

export const INITIAL_PROFILE_FORM: ProfileFormState = {
  firstName: '',
  lastName: '',
  pseudo: '',
  email: '',
  password: '',
  confirmPassword: '',
};
