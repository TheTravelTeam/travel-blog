/**
 * Payload used to create or update a comment through the API.
 * Mirrors the backend `UpsertCommentDTO` contract.
 */
export interface UpsertCommentDto {
  /** Identifier of the step the comment is attached to. */
  stepId: number;
  /** Raw textual content typed by the user. */
  content: string;
}

