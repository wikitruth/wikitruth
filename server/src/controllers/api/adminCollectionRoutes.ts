'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';

type AdminListQuery = {
  sort: (sort: Record<string, 1 | -1>) => AdminListQuery;
  skip: (amount: number) => AdminListQuery;
  limit: (amount: number) => AdminListQuery;
  lean: () => Promise<unknown[]>;
};

type AdminDetailQuery = {
  lean: () => Promise<unknown | null>;
};

type AdminModel = {
  base?: { Types?: { ObjectId?: { isValid?: (value: string) => boolean } } };
  schema?: { path?: (name: string) => { instance?: string } | undefined };
  find: (criteria?: Record<string, unknown>) => AdminListQuery;
  findById: (id: string) => AdminDetailQuery;
  countDocuments: (criteria?: Record<string, unknown>) => Promise<number>;
};

type AdminCollectionConfig = {
  path: string;
  label: string;
  model: AdminModel;
  searchFields: string[];
  sanitize?: (record: unknown) => Record<string, unknown> | null;
  stringId?: boolean;
};

type EnsureAdmin = (req: WikitruthRequest, res: WikitruthResponse) => boolean;

export type AdminCollectionModels = {
  User: AdminModel;
  Account: AdminModel;
  Admin: AdminModel;
  AdminGroup: AdminModel;
  Category: AdminModel;
  Status: AdminModel;
};

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 1_000_000;
const MAX_SEARCH_LENGTH = 100;

function boundedInteger(value: unknown, fallback: number, maximum: number): number {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(parsed, maximum);
}

function escapedRegex(value: string): RegExp {
  return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

function isObjectIdModel(model: AdminModel): boolean {
  return model.schema?.path?.('_id')?.instance === 'ObjectId';
}

function isValidObjectId(model: AdminModel, value: string): boolean {
  return Boolean(model.base?.Types?.ObjectId?.isValid?.(value));
}

function buildSearchCriteria(
  config: AdminCollectionConfig,
  query: string
): Record<string, unknown> {
  if (!query) {
    return {};
  }

  const matcher = escapedRegex(query);
  const alternatives: Record<string, unknown>[] = config.searchFields.map(field => ({
    [field]: matcher,
  }));
  if (config.stringId) {
    alternatives.push({ _id: matcher });
  } else if (isObjectIdModel(config.model) && isValidObjectId(config.model, query)) {
    alternatives.push({ _id: query });
  }

  return { $or: alternatives };
}

function canLookupId(config: AdminCollectionConfig, id: string): boolean {
  return config.stringId || !isObjectIdModel(config.model) || isValidObjectId(config.model, id);
}

function transformRecord(config: AdminCollectionConfig, record: unknown): unknown {
  return config.sanitize ? config.sanitize(record) : record;
}

export function registerAdminCollectionRoutes(
  router: Router,
  ensureAdmin: EnsureAdmin,
  models: AdminCollectionModels,
  sanitizeUser: (record: unknown) => Record<string, unknown> | null
): void {
  const collections: AdminCollectionConfig[] = [
    {
      path: '/users',
      label: 'User',
      model: models.User,
      searchFields: ['username', 'email', 'search'],
      sanitize: sanitizeUser,
    },
    {
      path: '/accounts',
      label: 'Account',
      model: models.Account,
      searchFields: [
        'name.full',
        'name.first',
        'name.middle',
        'name.last',
        'company',
        'phone',
        'user.name',
        'search',
      ],
    },
    {
      path: '/administrators',
      label: 'Administrator',
      model: models.Admin,
      searchFields: ['name.full', 'name.first', 'name.middle', 'name.last', 'user.name', 'search'],
    },
    {
      path: '/groups',
      label: 'Admin group',
      model: models.AdminGroup,
      searchFields: ['name'],
      stringId: true,
    },
    {
      path: '/categories',
      label: 'Category',
      model: models.Category,
      searchFields: ['title', 'id'],
    },
    {
      path: '/statuses',
      label: 'Status',
      model: models.Status,
      searchFields: ['name', 'pivot'],
      stringId: true,
    },
  ];

  for (const collection of collections) {
    router.get(collection.path, async function (req: WikitruthRequest, res: WikitruthResponse) {
      if (!ensureAdmin(req, res)) {
        return;
      }

      const page = boundedInteger(req.query.page, 1, MAX_PAGE);
      const limit = boundedInteger(req.query.limit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
      const query = String(req.query.q || '')
        .trim()
        .slice(0, MAX_SEARCH_LENGTH);
      const criteria = buildSearchCriteria(collection, query);
      const [records, total] = await Promise.all([
        collection.model
          .find(criteria)
          .sort({ _id: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        collection.model.countDocuments(criteria),
      ]);
      const items = (records as unknown[])
        .map(record => transformRecord(collection, record))
        .filter(Boolean);

      res.json({
        success: true,
        items,
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit)),
        query,
      });
    });

    router.get(
      `${collection.path}/:id`,
      async function (req: WikitruthRequest, res: WikitruthResponse) {
        if (!ensureAdmin(req, res)) {
          return;
        }

        const id = String(req.params.id || '').trim();
        const record =
          id && canLookupId(collection, id) ? await collection.model.findById(id).lean() : null;
        const item = transformRecord(collection, record);
        if (!item) {
          res.status(404).json({ success: false, message: `${collection.label} not found` });
          return;
        }

        res.json({ success: true, item });
      }
    );
  }
}
