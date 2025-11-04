import { MediaPayload } from '@model/stepFormResult.model';

export interface DiaryFormPayload {
  title: string;
  startDate: string | null;
  coverUrl: string | null;
  description: string;
  isPrivate?: boolean | null;
  canComment?: boolean | null;
}

export interface StepFormPayload {
  title: string;
  city: string | null;
  country: string | null;
  continent: string | null;
  latitude: number;
  longitude: number;
  description: string;
  mediaUrl: string | null;
  media?: MediaPayload[];
  startDate: string | null;
  endDate: string | null;
  themeId: number | null;
}

export interface DiaryCreationPayload {
  diary: DiaryFormPayload;
  step: StepFormPayload;
}
