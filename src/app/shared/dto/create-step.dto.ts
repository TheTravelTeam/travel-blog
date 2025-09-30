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

  // Optional theme association (deduplicated list of theme identifiers)
  // Always provide an array (can be empty) to satisfy the backend contract.
  themeIds: number[];

  // Future extensions: themes, media, comments handled server-side
}
