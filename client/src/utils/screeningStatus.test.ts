import { getScreeningStatusPresentation } from './screeningStatus';

describe('getScreeningStatusPresentation', () => {
  it.each([
    [0, 'pending', 'label-warning'],
    [1, 'accepted', 'label-success'],
    [2, 'rejected', 'label-danger'],
    [3, 'archived', 'label-default'],
  ])('turns numeric status %s into a semantic label', (status, label, className) => {
    expect(getScreeningStatusPresentation(status)).toEqual({ label, className });
  });

  it('accepts numeric strings and readable status names', () => {
    expect(getScreeningStatusPresentation('1')?.label).toBe('accepted');
    expect(getScreeningStatusPresentation('pending')?.label).toBe('pending');
  });

  it('returns no presentation when status is absent', () => {
    expect(getScreeningStatusPresentation(undefined)).toBeNull();
  });
});
