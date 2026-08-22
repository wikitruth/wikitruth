export type EntryType = 'topic' | 'argument' | 'question' | 'answer' | 'artifact' | 'issue' | 'opinion';
export type AgentCommand = {
  commandId: string;
  operation: 'entry.create' | 'entry.propose_edit';
  entryType: EntryType;
  entryId?: string;
  baseRevisionId?: string;
  payload: Record<string, unknown>;
};
export type AgentRun = {
  runId: string;
  model?: string;
  provider?: string;
  purpose?: string;
  sourceManifest?: Array<Record<string, string>>;
};
export type CursorPage<T> = { items: T[]; nextCursor: string | null };
export type AgentJob = {
  _id?: string;
  id?: string;
  agentRunId: string;
  status: 'queued' | 'running' | 'cancel_requested' | 'cancelled' | 'completed' | 'completed_with_errors' | 'failed';
  results?: Array<Record<string, unknown>>;
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  run?: AgentRun;
  idempotencyKey?: string;
  signal?: AbortSignal;
};

export class AgentApiError extends Error {
  constructor(public status: number, public payload: unknown, message: string) {
    super(message);
    this.name = 'AgentApiError';
  }
}

function randomKey(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  return randomUuid ? `sdk-${randomUuid}` : `sdk-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function retryDelay(response: Response | null, attempt: number): number {
  const retryAfter = Number(response?.headers.get('retry-after') || 0);
  if (retryAfter > 0) return Math.min(30_000, retryAfter * 1000);
  return Math.min(5_000, 250 * (2 ** attempt));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class WikitruthAgentClient {
  private readonly fetcher: typeof fetch;

  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly retries = 3,
    fetcher: typeof fetch = globalThis.fetch,
  ) {
    if (!token.startsWith('wt_agent_')) throw new Error('A Wikitruth agent token is required');
    if (!fetcher) throw new Error('A Fetch API implementation is required');
    this.fetcher = fetcher;
  }

  private headers(options: RequestOptions): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/json',
      'Accept-Version': '1',
    };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
    if (options.run) {
      headers['X-Agent-Run-Id'] = options.run.runId;
      if (options.run.model) headers['X-Agent-Model'] = options.run.model;
      if (options.run.provider) headers['X-Agent-Provider'] = options.run.provider;
      if (options.run.purpose) headers['X-Agent-Purpose'] = options.run.purpose;
      if (options.run.sourceManifest?.length) headers['X-Agent-Source-Manifest'] = JSON.stringify(options.run.sourceManifest);
    }
    return headers;
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method || 'GET';
    const mutationIsReplaySafe = method === 'GET' || method === 'HEAD' || Boolean(options.idempotencyKey);
    let response: Response | null = null;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      try {
        response = await this.fetcher(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
          method, headers: this.headers(options),
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          signal: options.signal,
        });
        if (response.ok) return await response.json() as T;
        if (!mutationIsReplaySafe || ![429, 502, 503, 504].includes(response.status) || attempt === this.retries) break;
      } catch (error) {
        if (!mutationIsReplaySafe || attempt === this.retries || options.signal?.aborted) throw error;
      }
      await sleep(retryDelay(response, attempt));
    }
    const payload = response ? await response.json().catch(() => null) : null;
    const message = payload && typeof payload === 'object'
      ? String((payload as { error?: { message?: string }; message?: string }).error?.message || (payload as { message?: string }).message || 'Agent API request failed')
      : 'Agent API request failed';
    throw new AgentApiError(response?.status || 0, payload, message);
  }

  identity<T = Record<string, unknown>>(): Promise<T> { return this.request('/agent/identity'); }
  capabilities<T = Record<string, unknown>>(): Promise<T> { return this.request('/agent/capabilities'); }
  validate<T = Record<string, unknown>>(commands: AgentCommand[]): Promise<T> {
    return this.request('/agent/validate', { method: 'POST', body: { commands } });
  }
  createEntry<T = Record<string, unknown>>(entryType: EntryType, payload: Record<string, unknown>, run: AgentRun, idempotencyKey = randomKey()): Promise<T> {
    return this.request(`/${entryType}s`, { method: 'POST', body: payload, run, idempotencyKey });
  }
  proposeEdit<T = Record<string, unknown>>(entryType: EntryType, entryId: string, baseRevisionId: string, payload: Record<string, unknown>, run: AgentRun, idempotencyKey = randomKey()): Promise<T> {
    return this.request(`/${entryType}s/entry/${encodeURIComponent(entryId)}`, { method: 'PUT', body: { ...payload, baseRevisionId }, run, idempotencyKey });
  }
  createJob(commands: AgentCommand[], run: AgentRun, idempotencyKey = randomKey()): Promise<{ success: true; job: AgentJob }> {
    return this.request('/agent/jobs', { method: 'POST', body: { commands }, run, idempotencyKey });
  }
  getJob(id: string): Promise<{ success: true; job: AgentJob }> { return this.request(`/agent/jobs/${encodeURIComponent(id)}`); }
  cancelJob(id: string, run: AgentRun, idempotencyKey = randomKey()): Promise<{ success: true; job: AgentJob }> {
    return this.request(`/agent/jobs/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: {}, run, idempotencyKey });
  }
  listJobs(cursor?: string, limit = 25): Promise<CursorPage<AgentJob>> {
    const query = new URLSearchParams({ limit: String(limit) });
    if (cursor) query.set('cursor', cursor);
    return this.request(`/agent/jobs?${query}`);
  }
  async *iterateJobs(limit = 25): AsyncGenerator<AgentJob> {
    let cursor: string | undefined;
    do {
      const page = await this.listJobs(cursor, limit);
      for (const item of page.items) yield item;
      cursor = page.nextCursor || undefined;
    } while (cursor);
  }
  activity<T = Record<string, unknown>>(cursor?: string, runId?: string, limit = 25): Promise<T> {
    const query = new URLSearchParams({ limit: String(limit) });
    if (cursor) query.set('cursor', cursor);
    if (runId) query.set('runId', runId);
    return this.request(`/agent/activity?${query}`);
  }
  async *events(signal?: AbortSignal): AsyncGenerator<Record<string, unknown>> {
    const response = await this.fetcher(`${this.baseUrl.replace(/\/$/, '')}/agent/events`, {
      headers: { ...this.headers({}), Accept: 'text/event-stream' }, signal,
    });
    if (!response.ok || !response.body) throw new AgentApiError(response.status, null, 'Agent event stream failed');
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += value;
      const frames = buffer.split('\n\n');
      buffer = frames.pop() || '';
      for (const frame of frames) {
        const data = frame.split('\n').find((line) => line.startsWith('data:'))?.slice(5).trim();
        if (data) yield JSON.parse(data) as Record<string, unknown>;
      }
    }
  }
}
