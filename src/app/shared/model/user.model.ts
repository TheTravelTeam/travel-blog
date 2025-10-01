export interface User {
  /** Unique identifier provided by the backend. */
  id: number;
  /** Public display name chosen by the user. */
  pseudo: string;
  /** Optional avatar URL. */
  avatar?: string | null;
  /** Optional biography text. */
  biography?: string | null;
  /** Current activation status reported by the API. */
  status?: string | null;
  /** Indicates whether the account is enabled. */
  enabled?: boolean;
  /** Optional email when the backend returns it. */
  email?: string | null;
  roles?: string[];
  createdAt?: string;
  updatedAt?: string;
}
