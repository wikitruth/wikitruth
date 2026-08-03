import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import apiService from '../services/api';
import {
  CONTENT_VISIBILITY_STORAGE_KEY,
  normalizeContentVisibilityPreference,
  preferenceToApiView,
  type ApiViewMode,
  type ContentVisibilityPreference,
} from '../utils/contentVisibility';

interface ContentVisibilityContextValue {
  preference: ContentVisibilityPreference;
  effectiveView: ApiViewMode;
  saving: boolean;
  setPreference: (preference: ContentVisibilityPreference) => Promise<void>;
}

const DEFAULT_CONTENT_VISIBILITY_CONTEXT: ContentVisibilityContextValue = {
  preference: 'accepted',
  effectiveView: 'wiki',
  saving: false,
  setPreference: async () => undefined,
};

const ContentVisibilityContext = createContext<ContentVisibilityContextValue>(DEFAULT_CONTENT_VISIBILITY_CONTEXT);

function readGuestPreference(): ContentVisibilityPreference {
  try {
    return normalizeContentVisibilityPreference(localStorage.getItem(CONTENT_VISIBILITY_STORAGE_KEY));
  } catch {
    return 'accepted';
  }
}

export const ContentVisibilityProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { user, updateUser } = useAuth();
  const [preference, setPreferenceState] = useState<ContentVisibilityPreference>(readGuestPreference);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = user
      ? normalizeContentVisibilityPreference(user.preferences?.contentVisibility)
      : readGuestPreference();
    setPreferenceState(next);
  }, [user]);

  const setPreference = useCallback(async (next: ContentVisibilityPreference) => {
    const normalized = normalizeContentVisibilityPreference(next);
    const previous = preference;
    setPreferenceState(normalized);
    try {
      localStorage.setItem(CONTENT_VISIBILITY_STORAGE_KEY, normalized);
    } catch {
      // A blocked browser store must not make the control unusable for this session.
    }

    if (!user) return;

    setSaving(true);
    updateUser({ preferences: { ...user.preferences, contentVisibility: normalized } });
    try {
      await apiService.updateCurrentMemberPreferences({ contentVisibility: normalized });
    } catch (error) {
      setPreferenceState(previous);
      try {
        localStorage.setItem(CONTENT_VISIBILITY_STORAGE_KEY, previous);
      } catch {
        // Keep the in-memory rollback even when browser storage is unavailable.
      }
      updateUser({ preferences: { ...user.preferences, contentVisibility: previous } });
      throw error;
    } finally {
      setSaving(false);
    }
  }, [preference, updateUser, user]);

  const value = useMemo<ContentVisibilityContextValue>(() => ({
    preference,
    effectiveView: preferenceToApiView(preference),
    saving,
    setPreference,
  }), [preference, saving, setPreference]);

  return <ContentVisibilityContext.Provider value={value}>{children}</ContentVisibilityContext.Provider>;
};

export const ContentVisibilityScope: React.FC<React.PropsWithChildren<{ view: ApiViewMode }>> = ({ view, children }) => {
  const parent = useContentVisibility();
  const value = useMemo(() => ({ ...parent, effectiveView: view }), [parent, view]);
  return <ContentVisibilityContext.Provider value={value}>{children}</ContentVisibilityContext.Provider>;
};

export function useContentVisibility(): ContentVisibilityContextValue {
  return useContext(ContentVisibilityContext);
}
