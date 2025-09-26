// Payload expected by backend StepDTO
export interface CreateStepDto {
  title: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  travelDiaryId: number;

  // Dates as ISO LocalDate strings (YYYY-MM-DD)
  startDate?: string | null;
  endDate?: string | null;

  // Travel status enum values per backend
  status?: 'IN_PROGRESS' | 'COMPLETED' | null;

  // Optional location metadata
  city?: string | null;
  country?: string | null;
  continent?: string | null;

  // Future extensions: themes, media, comments handled server-side
}
