export interface StepFormResult {
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

export interface MediaPayload {
  fileUrl: string;
  publicId?: string;
}
