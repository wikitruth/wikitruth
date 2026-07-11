import React from 'react';
import userEvent from '@testing-library/user-event';

import { render, screen } from '../../test-utils/render';
import { EMPTY_ARTIFACT_PROVENANCE } from '../../constants/artifactOptions';
import ArtifactProvenanceFields from './ArtifactProvenanceFields';

describe('ArtifactProvenanceFields', () => {
  it('captures evidence kind and origin independently from the legacy classification', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <ArtifactProvenanceFields
        value={{ ...EMPTY_ARTIFACT_PROVENANCE }}
        onChange={onChange}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/artifact kind/i), 'dataset');
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ artifactType: 'dataset' }));

    await user.selectOptions(screen.getByLabelText(/origin type/i), 'primary');
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ originType: 'primary' }));
    expect(screen.getByLabelText(/archive url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/verifiability notes/i)).toBeInTheDocument();
  });
});
