function normalizeBaseUrl(value: string): string {
  if (!value) {
    return '/api';
  }

  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export const API_BASE_URL = normalizeBaseUrl(process.env.REACT_APP_API_BASE_URL || '/api');

export default API_BASE_URL;
