export const API_ERROR_CODES = {
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  API_ERROR: 'API_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DB_UNAVAILABLE: 'DB_UNAVAILABLE',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

export class AppError extends Error {
  public readonly status: number;
  public readonly code: ApiErrorCode;
  public readonly details?: unknown;

  constructor(params: { status?: number; code: ApiErrorCode; message: string; details?: unknown }) {
    super(params.message);
    this.name = 'AppError';
    this.status = params.status ?? 500;
    this.code = params.code;
    this.details = params.details;
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

/**
 * Normalize an unknown caught value into a safe, predictable shape suitable for
 * logging or returning in JSON error envelopes. Avoids the
 * `(error as Error).message` cast that hides truthy non-Error rejections (e.g.
 * thrown strings, mongoose validation objects, axios error envelopes).
 *
 * Use in API/service catch blocks instead of casting `error as Error`.
 */
export interface NormalizedError {
  message: string;
  name: string;
  code?: string;
  stack?: string;
  cause?: unknown;
}

export function normalizeError(value: unknown): NormalizedError {
  if (value instanceof Error) {
    const code = (value as Error & { code?: unknown }).code;
    return {
      message: value.message || value.name || 'Unknown error',
      name: value.name || 'Error',
      code: typeof code === 'string' ? code : undefined,
      stack: value.stack,
      cause: (value as Error & { cause?: unknown }).cause,
    };
  }

  if (typeof value === 'string') {
    return { message: value, name: 'Error' };
  }

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const message = typeof obj.message === 'string' ? obj.message : JSON.stringify(value);
    const name = typeof obj.name === 'string' ? obj.name : 'Error';
    const code = typeof obj.code === 'string' ? obj.code : undefined;
    return { message, name, code };
  }

  return { message: String(value ?? 'Unknown error'), name: 'Error' };
}

/** Convenience for the common `error.message` access pattern. */
export function errorMessage(value: unknown): string {
  return normalizeError(value).message;
}
