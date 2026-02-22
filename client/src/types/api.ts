export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code?: string;
}
