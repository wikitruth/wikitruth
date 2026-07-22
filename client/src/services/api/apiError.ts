export interface ApiErrorPayload {
  success?: boolean;
  code?: string;
  message?: string;
  error?: string | { code?: string; message?: string };
  [key: string]: unknown;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: ApiErrorPayload;

  constructor(status: number, message: string, code?: string, details?: ApiErrorPayload) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiErrorFromResponse(response: Response): Promise<ApiRequestError> {
  let payload: ApiErrorPayload | undefined;
  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    // Non-JSON errors retain the status-based fallback below.
  }

  const nested = payload?.error && typeof payload.error === 'object' ? payload.error : undefined;
  const message =
    String(payload?.message || '').trim() ||
    (typeof payload?.error === 'string' ? payload.error.trim() : '') ||
    String(nested?.message || '').trim() ||
    `API request failed: ${response.status}`;
  const code = String(payload?.code || nested?.code || '').trim() || undefined;
  return new ApiRequestError(response.status, message, code, payload);
}
