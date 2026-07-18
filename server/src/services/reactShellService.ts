import { promises as fs } from 'fs';
import path from 'path';
import type { Request } from 'express';
import type { ApplicationDefinition } from '../types/domain';
import type { CivicTenantDefinition } from '../types/civicTenancy';
import applicationsMod from '../models/applications';
import { builtInCivicTenant } from '../config/civicTenants';
import { resolveReactShellMetadata } from './reactShellMetadataService';

const shellPath = path.join(process.cwd(), 'public/react-app.html');
let shellTemplate: Promise<string> | null = null;

const applications = applicationsMod as unknown as {
  applicationFromCivicTenant: (tenant: CivicTenantDefinition) => ApplicationDefinition;
};

function loadShellTemplate(): Promise<string> {
  shellTemplate ||= fs.readFile(shellPath, 'utf8');
  return shellTemplate;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeApplicationId(application: ApplicationDefinition | null): string {
  return String(application?.id || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function requestsLocalCivicShell(req: Request): boolean {
  const value = String(req.query?.civic || '').trim().toLowerCase();
  return value === '1' || value === 'true' || req.path === '/civic' || req.path.startsWith('/civic/');
}

export async function resolveReactShellApplication(
  req: Request,
  hostApplication: ApplicationDefinition | null,
): Promise<ApplicationDefinition | null> {
  if (!requestsLocalCivicShell(req)) return hostApplication;

  const tenantId = String(
    process.env.CIVIC_FIXED_TENANT_ID || process.env.CIVIC_DEFAULT_TENANT_ID || 'fixtheph',
  ).trim().toLowerCase();
  const CivicTenant = (req.app as unknown as {
    db?: { models?: { CivicTenant?: { findOne?: (query: Record<string, unknown>) => { lean: () => Promise<unknown> } } } };
  }).db?.models?.CivicTenant;
  const persisted = CivicTenant?.findOne
    ? await CivicTenant.findOne({ status: 'active', tenantId }).lean()
    : null;
  const tenant = (persisted as CivicTenantDefinition | null) || builtInCivicTenant(tenantId);
  if (!tenant) return hostApplication;

  const localApplication = applications.applicationFromCivicTenant(tenant);
  if (hostApplication && hostApplication.id !== localApplication.id) {
    const error = new Error('Requested civic application does not match the current host') as Error & { statusCode?: number };
    error.statusCode = 409;
    throw error;
  }
  return hostApplication || localApplication;
}

function requestOrigin(req: Request): string {
  const forwardedHost = String(req.get('x-forwarded-host') || req.get('host') || '').split(',')[0]?.trim() || '';
  const safeHost = /^[a-z0-9.[\]:_-]+$/i.test(forwardedHost) ? forwardedHost : 'wikitruth.net';
  const forwardedProtocol = String(req.get('x-forwarded-proto') || '').split(',')[0]?.trim().toLowerCase();
  const protocol = forwardedProtocol === 'http' || forwardedProtocol === 'https' ? forwardedProtocol : req.protocol;
  return `${protocol || 'https'}://${safeHost}`;
}

function absoluteUrl(value: string, origin: string): string {
  try {
    return new URL(value, origin).toString();
  } catch (_error) {
    return origin;
  }
}

function faviconLinks(favicon: string | undefined): string {
  const base = favicon && favicon.includes('/')
    ? favicon.slice(0, favicon.lastIndexOf('/'))
    : '/img/favicons';
  const manifest = favicon ? `${base}/manifest.json` : '/manifest.webmanifest';
  return [
    [57, 'apple-touch-icon', `${base}/apple-icon-57x57.png`],
    [60, 'apple-touch-icon', `${base}/apple-icon-60x60.png`],
    [72, 'apple-touch-icon', `${base}/apple-icon-72x72.png`],
    [76, 'apple-touch-icon', `${base}/apple-icon-76x76.png`],
    [114, 'apple-touch-icon', `${base}/apple-icon-114x114.png`],
    [120, 'apple-touch-icon', `${base}/apple-icon-120x120.png`],
    [144, 'apple-touch-icon', `${base}/apple-icon-144x144.png`],
    [152, 'apple-touch-icon', `${base}/apple-icon-152x152.png`],
    [180, 'apple-touch-icon', `${base}/apple-icon-180x180.png`],
  ].map(([size, rel, href]) => `    <link rel="${rel}" sizes="${size}x${size}" href="${href}">`).concat([
    `    <link rel="icon" type="image/png" sizes="192x192" href="${base}/android-icon-192x192.png">`,
    `    <link rel="icon" type="image/png" sizes="32x32" href="${base}/favicon-32x32.png">`,
    `    <link rel="icon" type="image/png" sizes="96x96" href="${base}/favicon-96x96.png">`,
    `    <link rel="icon" type="image/png" sizes="16x16" href="${base}/favicon-16x16.png">`,
    `    <link rel="icon" href="${favicon || `${base}/favicon.ico`}">`,
    `    <link rel="manifest" href="${manifest}">`,
  ]).join('\n');
}

export async function renderReactShell(req: Request, application: ApplicationDefinition | null): Promise<string> {
  const template = await loadShellTemplate();
  const tenant = (application?.civicTenant || null) as {
    branding?: { favicon?: string; primaryColor?: string };
  } | null;
  const origin = requestOrigin(req);
  const siteName = String(application?.navTitle || application?.title || 'Wikitruth');
  const defaultDescription = String(
    application?.slogan ||
    (application?.jumbotron as { description?: string } | undefined)?.description ||
    'A systematic discourse and knowledge contribution using dialectics and vetting.',
  );
  const routeMetadata = await resolveReactShellMetadata(req, application);
  const description = routeMetadata?.description || defaultDescription;
  const documentTitle = routeMetadata
    ? `${routeMetadata.title} | ${siteName}`
    : application ? `${String(application.title || siteName)}, ${description}` : 'Wikitruth, the truth in totality of human knowledge';
  const canonicalUrl = absoluteUrl(routeMetadata?.canonicalPath || req.path || '/', origin);
  const logo = absoluteUrl(String(application?.logoIcon || '/img/logo-64x64.png'), origin);
  const appId = safeApplicationId(application);
  const structuredData = JSON.stringify(routeMetadata?.structuredData || {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    description,
    url: origin,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${origin}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }).replace(/</g, '\\u003c');

  const replacements: Record<string, string> = {
    '__WT_DOCUMENT_TITLE__': escapeHtml(documentTitle),
    '__WT_SITE_NAME__': escapeHtml(siteName),
    '__WT_DESCRIPTION__': escapeHtml(description),
    '__WT_CANONICAL_URL__': escapeHtml(canonicalUrl),
    '__WT_LOGO_URL__': escapeHtml(logo),
    '__WT_OG_TYPE__': escapeHtml(routeMetadata?.ogType || 'website'),
    '__WT_ICON_LINKS__': faviconLinks(tenant?.branding?.favicon),
    '__WT_THEME_COLOR__': escapeHtml(tenant?.branding?.primaryColor || '#ffffff'),
    '__WT_TILE_IMAGE__': escapeHtml(`${tenant?.branding?.favicon?.replace(/\/[^/]+$/, '') || '/img/favicons'}/ms-icon-144x144.png`),
    '__WT_STRUCTURED_DATA__': structuredData,
    '__WT_BODY_CLASS__': appId ? `wt-tenant-app app-${appId}` : '',
    '__WT_APP_ID__': escapeHtml(appId),
  };

  return Object.entries(replacements).reduce(
    (html, [token, value]) => html.split(token).join(value),
    template,
  );
}
