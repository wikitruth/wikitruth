import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { useContentVisibility } from '../context/ContentVisibilityContext';
import {
  normalizePageViewMode,
  type ApiViewMode,
  type PageViewMode,
  visibilityLabel,
} from '../utils/contentVisibility';

export function usePageContentVisibility() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { effectiveView: preferredView } = useContentVisibility();
  const override = normalizePageViewMode(searchParams.get('view'));
  const effectiveView: ApiViewMode = override === 'default' ? preferredView : override;

  const setOverride = useCallback((next: PageViewMode) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'default') params.delete('view');
    else params.set('view', next);
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  return useMemo(() => ({
    override,
    effectiveView,
    defaultLabel: visibilityLabel(preferredView),
    setOverride,
    searchParams,
    setSearchParams,
  }), [effectiveView, override, preferredView, searchParams, setOverride, setSearchParams]);
}
