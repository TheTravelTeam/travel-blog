/**
 * Normalises theme identifiers coming from form controls.
 * @param primaryCandidate Value coming from the legacy `themeId` control.
 * @param rawThemeIds Value coming from the multi-select control.
 */
export function normalizeThemeSelection(
  primaryCandidate: unknown,
  rawThemeIds: unknown
): { themeIds: number[]; primaryThemeId: number | null } {
  const fromArray = Array.isArray(rawThemeIds) ? rawThemeIds : [];
  const parsedFromArray = fromArray
    .map(coerceThemeIdentifier)
    .filter((id): id is number => id != null);

  const candidate = coerceThemeIdentifier(primaryCandidate);

  const merged = candidate != null ? [candidate, ...parsedFromArray] : parsedFromArray;
  const themeIds = Array.from(new Set(merged.filter((id): id is number => id != null)));

  const primaryThemeId = candidate ?? (themeIds.length ? themeIds[0] : null);

  return { themeIds, primaryThemeId };
}

/**
 * Normalises a collection of potential theme identifiers without computing a primary id.
 * @param primaryCandidate Single theme identifier candidate.
 * @param rawThemeIds Multi-select values.
 */
export function normalizeThemeIds(primaryCandidate: unknown, rawThemeIds: unknown): number[] {
  return normalizeThemeSelection(primaryCandidate, rawThemeIds).themeIds;
}

function coerceThemeIdentifier(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}
