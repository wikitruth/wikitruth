import { completeKnowledgeReviewTask, getKnowledgeHealth } from './epistemic';

describe('epistemic api', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    global.fetch = jest.fn();
    document.cookie = '_csrfToken=health-token; path=/';
  });

  it('loads a filtered knowledge-health queue', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, health: { generatedAt: '', total: 0, queues: [] } }),
    } as Response);

    await getKnowledgeHealth('stale_sources', 15);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/epistemic/health?limit=15&queue=stale_sources'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('sends csrf protection when completing a review task', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    await completeKnowledgeReviewTask('task-1', 'completed');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/epistemic/review-tasks/task-1'),
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({ 'x-csrf-token': 'health-token' }),
      }),
    );
  });
});
