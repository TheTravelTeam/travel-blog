/**
 * Decode a string containing HTML entities into its plain-text representation.
 * Provides a lightweight fallback for server-side environments where `document`
 * is not available.
 */
export function decodeHtmlEntities(value: string | null | undefined): string {
  if (!value) {
    return value ?? '';
  }

  const hasDom =
    typeof window !== 'undefined' && typeof document !== 'undefined' && !!document.createElement;

  if (hasDom) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;
    return textarea.value;
  }

  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#96;/g, '`');
}

/**
 * Supprime les balises HTML d'une chaîne et normalise les retours à la ligne/espaces.
 * Les balises de paragraphe et les sauts de ligne sont convertis en sauts de ligne textuels.
 */
export function stripHtmlTags(value: string | null | undefined): string {
  const decoded = decodeHtmlEntities(value);
  if (!decoded) {
    return '';
  }

  return decoded
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|li)>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}
