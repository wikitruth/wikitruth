export type Nullable<T> = T | null;

export interface Timestamped {
  createdAt?: string;
  updatedAt?: string;
}
