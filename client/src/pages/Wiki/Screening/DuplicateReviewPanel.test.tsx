import React from 'react';
import userEvent from '@testing-library/user-event';

import { render, screen, waitFor } from '../../../test-utils/render';
import moderationApi from '../../../services/api/moderation';
import DuplicateReviewPanel from './DuplicateReviewPanel';

jest.mock('../../../services/api/moderation', () => ({
  __esModule: true,
  default: {
    listDuplicates: jest.fn(),
    mergeDuplicate: jest.fn(),
  },
}));

const mockedApi = moderationApi as jest.Mocked<typeof moderationApi>;

describe('DuplicateReviewPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.listDuplicates.mockResolvedValue({
      success: true,
      candidates: [{
        id: 'target-1',
        title: 'Canonical climate policy',
        editDate: '2026-07-11T11:00:00.000Z',
        rule: 'exact_title',
        score: 1,
      }],
    });
    mockedApi.mergeDuplicate.mockResolvedValue({
      success: true,
      merge: {
        source: { objectType: 1, id: 'source-1' },
        target: { objectType: 1, id: 'target-1', path: '/topics/entry/canonical/target-1' },
        movedRelationships: {},
        redirectId: 'redirect-1',
      },
    });
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('requires an explicit target and reason before merging', async () => {
    const user = userEvent.setup();
    render(
      <DuplicateReviewPanel
        entry={{
          _id: 'source-1',
          objectType: 1,
          title: 'Duplicate climate policy',
          editDate: '2026-07-11T10:00:00.000Z',
        }}
        target={{ key: 'topic', id: 'source-1' }}
      />,
    );

    expect(await screen.findByText('Canonical climate policy')).toBeInTheDocument();
    const mergeButton = screen.getByRole('button', { name: /merge into selected entry/i });
    expect(mergeButton).toBeDisabled();

    await user.click(screen.getByRole('radio'));
    await user.type(screen.getByLabelText(/merge reason/i), 'Same scoped claim and evidence.');
    expect(mergeButton).toBeEnabled();
    await user.click(mergeButton);

    await waitFor(() => expect(mockedApi.mergeDuplicate).toHaveBeenCalledWith(expect.objectContaining({
      sourceId: 'source-1',
      targetId: 'target-1',
      reason: 'Same scoped claim and evidence.',
    })));
  });
});

