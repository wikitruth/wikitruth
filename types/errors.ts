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
