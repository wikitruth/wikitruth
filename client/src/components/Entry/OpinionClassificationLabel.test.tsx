import React from 'react';
import { render, screen } from '../../test-utils/render';
import OpinionClassificationLabel, { normalizeOpinionClassification } from './OpinionClassificationLabel';

describe('OpinionClassificationLabel', () => {
  it('presents classified discussion intent', () => {
    render(<OpinionClassificationLabel value="supplement" />);
    expect(screen.getByText('Supplement')).toHaveClass('label-info');
  });

  it('treats old unclassified comments as general comments', () => {
    expect(normalizeOpinionClassification(undefined)).toBe('general');
    render(<OpinionClassificationLabel value={undefined} />);
    expect(screen.getByText('Comment')).toBeInTheDocument();
  });
});
