import type { EntryBase } from './domain';

export interface ListQueryDto {
  limit?: number;
  sort?: string;
  page?: number;
}

export interface EntryLookupParams {
  id: string;
}

export interface EntryListResponse<TEntry extends EntryBase = EntryBase> {
  success: true;
  data: TEntry[];
}

export interface EntryDetailResponse<TEntry extends EntryBase = EntryBase> {
  success: true;
  data: TEntry;
}

export interface ValidationErrorDetail {
  [field: string]: string[] | undefined;
}

export interface ValidationErrorResponse {
  success: false;
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    details: ValidationErrorDetail;
  };
}
