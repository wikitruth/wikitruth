import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router';
import apiService from '../services/api';
import type { Application } from '../types';
import type { LegacyEntity } from '../types/legacy';
import { useContentVisibility } from './ContentVisibilityContext';

const PLATFORM_NAME = 'Wikitruth';
const PLATFORM_DESCRIPTION = 'A systematic discourse and knowledge contribution using dialectics and vetting';
const PLATFORM_LOGO = '/img/logo-64x64.png';

export interface ApplicationContextValue {
  application: Application | null;
  applications: Application[];
  appCategories: LegacyEntity[];
  loading: boolean;
  error: string | null;
  localTenantContext: boolean;
  platformHomeUrl: string;
  applicationPath: (path: string) => string;
  refresh: () => Promise<void>;
}

const defaultValue: ApplicationContextValue = {
  application: null,
  applications: [],
  appCategories: [],
  loading: false,
  error: null,
  localTenantContext: false,
  platformHomeUrl: '/',
  applicationPath: (path) => path,
  refresh: async () => undefined,
};

export const ApplicationContext = createContext<ApplicationContextValue>(defaultValue);

function addCivicContext(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/civic')) return path;
  const url = new URL(path, 'https://local.wikitruth.invalid');
  url.searchParams.set('civic', '1');
  return `${url.pathname}${url.search}${url.hash}`;
}

function manifestFromFavicon(favicon: string): string | null {
  const slash = favicon.lastIndexOf('/');
  return slash > 0 ? `${favicon.slice(0, slash)}/manifest.json` : null;
}

function safeTenantClass(application: Application | null): string | null {
  const id = String(application?.id || application?._id || '').trim().toLowerCase();
  const safeId = id.replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return safeId ? `app-${safeId}` : null;
}

const ApplicationDocumentIdentity: React.FC<{ application: Application | null }> = ({ application }) => {
  const tenant = application?.civicTenant;
  const siteName = application?.navTitle || application?.title || application?.name || PLATFORM_NAME;
  const description = application?.slogan || application?.jumbotron?.description || PLATFORM_DESCRIPTION;
  const favicon = tenant?.branding.favicon || PLATFORM_LOGO;
  const logo = application?.logoIcon || PLATFORM_LOGO;
  const manifest = tenant?.branding.favicon ? manifestFromFavicon(tenant.branding.favicon) : null;
  const themeColor = tenant?.branding.primaryColor || '#337ab7';
  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    description,
    url: typeof window !== 'undefined' ? window.location.origin : undefined,
  });

  return (
    <Helmet>
      <title>{siteName}</title>
      <meta name="application-name" content={siteName} />
      <meta name="description" content={description} />
      <meta name="theme-color" content={themeColor} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={logo} />
      <link rel="icon" href={favicon} />
      {manifest ? <link rel="manifest" href={manifest} /> : null}
      <script type="application/ld+json">{structuredData}</script>
    </Helmet>
  );
};

export const ApplicationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { effectiveView } = useContentVisibility();
  const localTenantContext = useMemo(() => {
    const civicQuery = new URLSearchParams(location.search).get('civic');
    return location.pathname === '/civic' || location.pathname.startsWith('/civic/') || civicQuery === '1';
  }, [location.pathname, location.search]);
  const [application, setApplication] = useState<Application | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [appCategories, setAppCategories] = useState<LegacyEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.getApplicationContext(localTenantContext, effectiveView);
      setApplication(response.application || null);
      setApplications(response.applications || []);
      setAppCategories(response.appCategories || []);
      setError(null);
    } catch (loadError) {
      setApplication(null);
      setApplications([]);
      setAppCategories([]);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load application context.');
    } finally {
      setLoading(false);
    }
  }, [effectiveView, localTenantContext]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const tenantClass = safeTenantClass(application);
    const tenant = application?.civicTenant;
    const style = document.documentElement.style;
    const properties = {
      '--tenant-primary': tenant?.branding.primaryColor || '',
      '--tenant-accent': tenant?.branding.accentColor || '',
      '--tenant-surface': tenant?.branding.surfaceColor || '',
      '--tenant-font': tenant?.branding.fontFamily || '',
    };

    if (tenantClass) {
      document.body.classList.add('wt-tenant-app', tenantClass);
      document.body.dataset.application = String(application?.id || application?._id || '');
      Object.entries(properties).forEach(([property, value]) => {
        if (value) style.setProperty(property, value);
      });
    }

    return () => {
      if (tenantClass) document.body.classList.remove('wt-tenant-app', tenantClass);
      delete document.body.dataset.application;
      Object.keys(properties).forEach((property) => style.removeProperty(property));
    };
  }, [application]);

  const applicationPath = useCallback(
    (path: string) => (localTenantContext ? addCivicContext(path) : path),
    [localTenantContext],
  );
  const platformHomeUrl = application && !localTenantContext ? 'https://wikitruth.net' : '/';
  const value = useMemo<ApplicationContextValue>(() => ({
    application,
    applications,
    appCategories,
    loading,
    error,
    localTenantContext,
    platformHomeUrl,
    applicationPath,
    refresh,
  }), [appCategories, application, applicationPath, applications, error, loading, localTenantContext, platformHomeUrl, refresh]);

  return (
    <ApplicationContext.Provider value={value}>
      {!loading ? <ApplicationDocumentIdentity application={application} /> : null}
      {children}
    </ApplicationContext.Provider>
  );
};

export function useApplicationContext(): ApplicationContextValue {
  return useContext(ApplicationContext);
}
