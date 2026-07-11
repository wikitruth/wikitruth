export function toDateTimeLocal(value: unknown): string {
  if (!value) {
    return '';
  }
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}
