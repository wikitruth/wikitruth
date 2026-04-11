import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

/**
 * Format a date string or Date object to a readable format.
 * Returns empty string for invalid dates.
 */
export function formatDate(date: string | Date | undefined | null, pattern = 'MMM d, yyyy'): string {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, pattern) : '';
}

/**
 * Format a date as relative time (e.g., "3 hours ago").
 */
export function formatRelativeTime(date: string | Date | undefined | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : '';
}

/**
 * Format a date with both absolute and relative time.
 * e.g., "Jan 5, 2025 (3 hours ago)"
 */
export function formatDateFull(date: string | Date | undefined | null): string {
  if (!date) return '';
  const abs = formatDate(date);
  const rel = formatRelativeTime(date);
  return abs && rel ? `${abs} (${rel})` : abs;
}
