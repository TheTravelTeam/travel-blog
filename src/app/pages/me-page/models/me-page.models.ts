import { TravelDiary } from '@model/travel-diary.model';
import { Media } from '@model/media.model';
import { Step } from '@model/step.model';
import { Theme } from '@model/theme.model';

export type SectionId = 'info' | 'diaries' | 'articles' | 'users';

export interface SectionItem {
  id: SectionId;
  label: string;
  adminOnly?: boolean;
}

export interface ManagedDiarySummary {
  id: number;
  title: string;
  destination?: string;
  coverUrl?: string | null;
  durationLabel?: string;
  stepCount?: number;
  isPrivate?: boolean;
}

export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  diaries: ManagedDiarySummary[];
}

export interface ManagedUserAction {
  userId: number;
  type: 'delete' | 'toggle-role';
}

export interface ArticleDraft {
  title: string;
  author: string;
  category: string;
  content: string;
  themeId: number | null;
}

export interface ArticleItem extends ArticleDraft {
  id: number;
  publishedAt: string;
  slug?: string;
  themes?: Theme[];
  userId?: number | null;
}

export interface ProfileFormState {
  firstName?: string;
  lastName?: string;
  pseudo: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export type NormalizedDiary = TravelDiary & { medias: Media[]; steps: Step[] };

export const INITIAL_ARTICLE_DRAFT: ArticleDraft = {
  title: '',
  author: '',
  category: '',
  content: '',
  themeId: null,
};

export const INITIAL_PROFILE_FORM: ProfileFormState = {
  firstName: '',
  lastName: '',
  pseudo: '',
  email: '',
  password: '',
  confirmPassword: '',
};
