export class StructuredDebateError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'StructuredDebateError';
    this.status = status;
    this.code = code;
  }
}
