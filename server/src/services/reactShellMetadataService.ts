'use strict';

import type { Request } from 'express';
import type { ApplicationDefinition } from '../types/domain';
import type { CivicTenantDefinition } from '../types/civicTenancy';

export interface ReactShellMetadata {
  title: string;
  description: string;
  canonicalPath: string;
  ogType: 'website' | 'article';
  structuredData: Record<string, unknown>;
}

const ENTRY_ROUTES: Record<string, { model: string; schemaType: string }> = {
  topics: { model: 'Topic', schemaType: 'Article' },
  arguments: { model: 'Argument', schemaType: 'Article' },
  questions: { model: 'Question', schemaType: 'Question' },
  answers: { model: 'Answer', schemaType: 'Answer' },
  issues: { model: 'Issue', schemaType: 'Article' },
  opinions: { model: 'Opinion', schemaType: 'Comment' },
  artifacts: { model: 'Artifact', schemaType: 'MediaObject' },
};

function plainText(value: unknown, maximum = 240): string {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maximum);
}

function databaseModels(req: Request): Record<string, any> {
  return (req.app as unknown as { db?: { models?: Record<string, any> } }).db?.models || {};
}

async function entryMetadata(req: Request, siteName: string): Promise<ReactShellMetadata | null> {
  const match = req.path.match(/^\/(topics|arguments|questions|answers|issues|opinions|artifacts)\/entry\/(?:[^/]+\/)?([a-f\d]{24})\/?$/i);
  if (!match) return null;
  const family = String(match[1] || '').toLowerCase();
  const route = ENTRY_ROUTES[family];
  if (!route || !match[2]) return null;
  const model = databaseModels(req)[route.model];
  if (!model?.findOne) return null;
  const entry = await model.findOne({ _id: match[2], private: { $ne: true } })
    .select('title friendlyUrl description content contentPreview summary')
    .lean();
  if (!entry) return null;
  const title = plainText(entry.title, 180) || siteName;
  const description = plainText(entry.description || entry.summary || entry.contentPreview || entry.content, 300)
    || `${title} on ${siteName}`;
  const friendly = String(entry.friendlyUrl || '').trim();
  const canonicalPath = `/${family}/entry/${friendly ? `${encodeURIComponent(friendly)}/` : ''}${entry._id}`;
  return {
    title,
    description,
    canonicalPath,
    ogType: 'article',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': route.schemaType,
      name: title,
      headline: title,
      description,
      mainEntityOfPage: canonicalPath,
      isPartOf: { '@type': 'WebSite', name: siteName },
    },
  };
}

async function civicMetadata(
  req: Request,
  application: ApplicationDefinition | null,
  siteName: string,
): Promise<ReactShellMetadata | null> {
  const match = req.path.match(/^\/civic\/records\/([a-f\d]{24})\/?$/i);
  if (!match) return null;
  const model = databaseModels(req).CivicRecord;
  if (!model?.findOne) return null;
  const tenant = application?.civicTenant as CivicTenantDefinition | undefined;
  const tenantId = String(tenant?.tenantId || '').trim().toLowerCase();
  const record = await model.findOne({
    _id: match[1],
    private: { $ne: true },
    ...(tenantId ? { tenantId } : {}),
  }).select('title summary description kind countryCode tenantId').lean();
  if (!record) return null;
  const title = plainText(record.title, 180) || siteName;
  const description = plainText(record.summary || record.description, 300) || `${title} civic accountability record`;
  const canonicalPath = `/civic/records/${record._id}`;
  return {
    title,
    description,
    canonicalPath,
    ogType: 'article',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description,
      genre: `Civic ${String(record.kind || 'record')}`,
      contentLocation: { '@type': 'Country', identifier: String(record.countryCode || '') },
      mainEntityOfPage: canonicalPath,
      isPartOf: { '@type': 'WebSite', name: siteName },
    },
  };
}

export async function resolveReactShellMetadata(
  req: Request,
  application: ApplicationDefinition | null,
): Promise<ReactShellMetadata | null> {
  const siteName = String(application?.navTitle || application?.title || 'Wikitruth');
  return await entryMetadata(req, siteName) || await civicMetadata(req, application, siteName);
}
