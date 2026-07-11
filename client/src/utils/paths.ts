import { ROUTE_PATHS } from './constants';

export const paths = ROUTE_PATHS;

export const toModernAppSectionUrl = (url?: string): string => {
  const normalizedUrl = String(url || '').trim();
  if (!normalizedUrl) return '/topics';
  if (normalizedUrl.startsWith('/legacy/topic/')) {
    return normalizedUrl.replace('/legacy/topic/', '/topics/entry/');
  }
  if (normalizedUrl.startsWith('/topic/')) {
    return normalizedUrl.replace('/topic/', '/topics/entry/');
  }
  return normalizedUrl;
};

export default paths;
