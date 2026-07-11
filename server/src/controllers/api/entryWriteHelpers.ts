export function parseNumericTags(value: unknown): number[] {
  const rawValues = Array.isArray(value) ? value : String(value || '').split(',');
  return Array.from(new Set(rawValues
    .map((tag) => Number(String(tag).trim()))
    .filter((tag) => Number.isInteger(tag) && tag > 0)));
}

export function parseOptionalDate(value: unknown): Date | null {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}
