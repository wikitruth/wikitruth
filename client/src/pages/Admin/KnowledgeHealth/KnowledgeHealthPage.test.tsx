import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test-utils/render';
import * as epistemicApi from '../../../services/api/epistemic';
import KnowledgeHealthPage from './KnowledgeHealthPage';

jest.mock('../../../services/api/epistemic');
jest.mock('../../../components/common/PageMeta', () => ({ __esModule: true, default: () => null }));

const mockedApi = epistemicApi as jest.Mocked<typeof epistemicApi>;

describe('KnowledgeHealthPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.getKnowledgeHealth.mockResolvedValue({
      generatedAt: '2026-07-28T00:00:00.000Z', total: 2,
      queues: [{
        key: 'quorum_gaps', label: 'Consensus quorum gaps', count: 2,
        items: [{
          id: 'task-1', taskId: 'task-1', title: 'factual review lacks quorum', objectName: 'topic',
          reason: 'Only two eligible votes', path: '/topics/entry/topic-1', priority: 'elevated',
        }],
      }],
    });
    mockedApi.completeKnowledgeReviewTask.mockResolvedValue(undefined);
  });

  it('shows queue counts and completes durable review tasks', async () => {
    const user = userEvent.setup();
    render(<KnowledgeHealthPage />, { route: '/admin/knowledge-health' });

    expect(await screen.findByText('Consensus quorum gaps')).toBeInTheDocument();
    expect(screen.getByText('factual review lacks quorum')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Complete' }));

    await waitFor(() => expect(mockedApi.completeKnowledgeReviewTask).toHaveBeenCalledWith('task-1', 'completed'));
    expect(mockedApi.getKnowledgeHealth).toHaveBeenCalledTimes(2);
  });

  it('loads a selected queue filter', async () => {
    const user = userEvent.setup();
    render(<KnowledgeHealthPage />);
    await screen.findByText('Consensus quorum gaps');
    await user.selectOptions(screen.getByLabelText('Queue'), 'evidence_gaps');
    await waitFor(() => expect(mockedApi.getKnowledgeHealth).toHaveBeenLastCalledWith('evidence_gaps'));
  });
});
