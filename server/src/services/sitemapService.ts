'use strict';

import type { Request } from 'express';
import type { ApplicationDefinition } from '../types/domain';
import type { CivicTenantDefinition } from '../types/civicTenancy';

const CORE_PATHS = ['/', '/explore', '/topics', '/arguments', '/questions', '/answers', '/artifacts', '/issues', '/opinions', '/groups', '/members', '/search', '/about', '/contact', '/policies'];
const ENTRY_FAMILIES = [
  ['topics', 'Topic'], ['arguments', 'Argument'], ['questions', 'Question'], ['answers', 'Answer'],
  ['artifacts', 'Artifact'], ['issues', 'Issue'], ['opinions', 'Opinion'],
] as const;

function origin(req: Request): string {
  const forwardedHost = String(req.get('x-forwarded-host') || req.get('host') || '').split(',')[0]?.trim() || '';
  const host = /^[a-z0-9.[\]:_-]+$/i.test(forwardedHost) ? forwardedHost : 'wikitruth.net';
  const forwardedProtocol = String(req.get('x-forwarded-proto') || '').split(',')[0]?.trim().toLowerCase() || '';
  const protocol = ['http', 'https'].includes(forwardedProtocol) ? forwardedProtocol : (req.protocol || 'https');
  return `${protocol}://${host}`;
}

function xml(value: unknown): string {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function models(req: Request): Record<string, any> {
  return (req.app as unknown as { db?: { models?: Record<string, any> } }).db?.models || {};
}

async function entryPaths(req: Request): Promise<string[]> {
  const database = models(req);
  const rows = await Promise.all(ENTRY_FAMILIES.map(async ([family, modelName]) => {
    const model = database[modelName];
    if (!model?.find) return [];
    const entries = await model.find({ private: { $ne: true } }).select('_id friendlyUrl editDate').sort({ editDate: -1 }).limit(5000).lean();
    return entries.map((entry: Record<string, unknown>) => ({
      path: `/${family}/entry/${entry.friendlyUrl ? `${encodeURIComponent(String(entry.friendlyUrl))}/` : ''}${entry._id}`,
      lastModified: entry.editDate,
    }));
  }));
  return rows.flat().map((row) => `${row.path}|${row.lastModified ? new Date(String(row.lastModified)).toISOString() : ''}`);
}

async function civicPaths(req: Request, application: ApplicationDefinition | null): Promise<string[]> {
  const tenant = application?.civicTenant as CivicTenantDefinition | undefined;
  if (!tenant) return [];
  const base = ['/civic', ...tenant.sections.filter((section) => section.enabled).map((section) => `/civic/${section.slug}`)];
  const model = models(req).CivicRecord;
  if (!model?.find) return base;
  const records = await model.find({ tenantId: tenant.tenantId, private: { $ne: true } })
    .select('_id editDate').sort({ editDate: -1 }).limit(5000).lean();
  return [...base, ...records.map((record: Record<string, unknown>) => `/civic/records/${record._id}|${record.editDate ? new Date(String(record.editDate)).toISOString() : ''}`)];
}

export async function renderSitemap(req: Request, application: ApplicationDefinition | null): Promise<string> {
  const requestOrigin = origin(req);
  const dynamicPaths = await entryPaths(req);
  const paths = [...CORE_PATHS, ...dynamicPaths, ...await civicPaths(req, application)];
  const unique = [...new Set(paths)];
  const rows = unique.map((row) => {
    const [pathname = '/', lastModified] = row.split('|');
    const lastmod = lastModified ? `<lastmod>${xml(lastModified)}</lastmod>` : '';
    return `  <url><loc>${xml(new URL(pathname, requestOrigin).toString())}</loc>${lastmod}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
}

export function renderRobots(req: Request): string {
  return `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${origin(req)}/sitemap.xml\n`;
}
