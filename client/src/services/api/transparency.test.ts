import { getPublicTrustDashboard } from './transparency';

describe('transparency API', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        dashboard: { generatedAt: '2026-08-05T00:00:00.000Z', summary: { publicKnowledge: 12 } },
      }),
    }) as jest.Mock;
  });

  it('loads the privacy-safe public dashboard', async () => {
    await expect(getPublicTrustDashboard()).resolves.toEqual(expect.objectContaining({
      generatedAt: '2026-08-05T00:00:00.000Z',
    }));
    expect(global.fetch).toHaveBeenCalledWith('/api/transparency/trust', expect.objectContaining({
      credentials: 'include',
    }));
  });

  it('fails closed when the aggregate response is unavailable', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ success: false, message: 'Unavailable' }),
    });
    await expect(getPublicTrustDashboard()).rejects.toThrow('Unavailable');
  });
});
