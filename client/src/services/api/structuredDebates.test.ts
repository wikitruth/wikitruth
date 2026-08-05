import {
  createStructuredDebate,
  getStructuredDebate,
  getStructuredDebateForEntry,
  joinStructuredDebate,
  submitStructuredDebateContribution,
  transitionStructuredDebate,
  withdrawStructuredDebate,
} from './structuredDebates';

const debate = { id: 'pilot-1', proposition: 'Evidence should guide this claim.' };

describe('structured debate API', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, debate }),
    }) as jest.Mock;
  });

  it('loads a pilot and resolves the active pilot for an entry', async () => {
    await expect(getStructuredDebate('pilot-1')).resolves.toEqual(debate);
    await expect(getStructuredDebateForEntry('topic', 'entry-1')).resolves.toEqual(debate);
    expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/structured-debates/pilot-1', expect.objectContaining({ credentials: 'include' }));
    expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/structured-debates/entry/topic/entry-1', expect.objectContaining({ credentials: 'include' }));
  });

  it('sends explicit consent, evidence, and facilitator actions', async () => {
    await createStructuredDebate({ entryObjectName: 'topic', entryId: 'entry-1', proposition: 'A clear proposition', participantLimit: 12, phaseWindowHours: 72 });
    await joinStructuredDebate('pilot-1', 'supports');
    await submitStructuredDebateContribution('pilot-1', {
      contributionType: 'evidence',
      content: 'A sufficiently detailed contribution supported by public evidence.',
      evidenceLinks: [{ url: 'https://example.test/source', label: 'Public source' }],
    });
    await transitionStructuredDebate('pilot-1', 'pause', 'Facilitator review is underway.');
    await withdrawStructuredDebate('pilot-1');

    const joinInit = (global.fetch as jest.Mock).mock.calls[1][1] as RequestInit;
    expect(JSON.parse(String(joinInit.body))).toEqual(expect.objectContaining({
      stance: 'supports',
      consentAccepted: true,
      publicAttributionAccepted: true,
      consentVersion: 'structured-debate-pilot-consent-v1',
    }));
    expect((global.fetch as jest.Mock).mock.calls.map((call) => call[0])).toEqual([
      '/api/structured-debates',
      '/api/structured-debates/pilot-1/join',
      '/api/structured-debates/pilot-1/contributions',
      '/api/structured-debates/pilot-1/transitions',
      '/api/structured-debates/pilot-1/withdraw',
    ]);
  });

  it('fails closed with the server message', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ success: false, error: { message: 'A pilot is already active.' } }),
    });
    await expect(getStructuredDebate('pilot-1')).rejects.toThrow('A pilot is already active.');
  });
});
