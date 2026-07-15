export type ScreeningStatusPresentation = {
  label: string;
  className: string;
};

const NUMERIC_STATUSES: Record<number, ScreeningStatusPresentation> = {
  0: { label: 'pending', className: 'label-warning' },
  1: { label: 'accepted', className: 'label-success' },
  2: { label: 'rejected', className: 'label-danger' },
  3: { label: 'archived', className: 'label-default' },
};

const TEXT_STATUSES: Record<string, ScreeningStatusPresentation> = {
  accepted: NUMERIC_STATUSES[1],
  active: NUMERIC_STATUSES[1],
  approved: NUMERIC_STATUSES[1],
  archived: NUMERIC_STATUSES[3],
  pending: NUMERIC_STATUSES[0],
  rejected: NUMERIC_STATUSES[2],
  unverified: NUMERIC_STATUSES[0],
};

export function getScreeningStatusPresentation(
  status: unknown
): ScreeningStatusPresentation | null {
  if (typeof status === 'number' && Number.isFinite(status)) {
    return NUMERIC_STATUSES[status] || { label: `status ${status}`, className: 'label-default' };
  }

  const normalized = String(status ?? '')
    .trim()
    .toLowerCase();
  if (!normalized) {
    return null;
  }

  const numeric = Number(normalized);
  if (Number.isInteger(numeric) && NUMERIC_STATUSES[numeric]) {
    return NUMERIC_STATUSES[numeric];
  }

  return (
    TEXT_STATUSES[normalized] || {
      label: normalized.replace(/[_-]+/g, ' '),
      className: 'label-info',
    }
  );
}
