'use strict';

import { z } from 'zod';

import { CIVIC_RECORD_KINDS, type CivicRecordKind } from '../types/civic';
import {
  CIVIC_EXTENSION_FIELD_TYPES,
  type CivicExtensionField,
  type CivicExtensionSchemas,
  type CivicExtensionValues,
} from '../types/civicTenancy';

const optionSchema = z.object({
  value: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(120),
}).strict();

const fieldSchema = z.object({
  key: z.string().trim().regex(/^[a-z][a-z0-9_]{0,39}$/),
  label: z.string().trim().min(1).max(80),
  type: z.enum(CIVIC_EXTENSION_FIELD_TYPES),
  description: z.string().trim().max(240).optional(),
  placeholder: z.string().trim().max(160).optional(),
  required: z.boolean().optional().default(false),
  options: z.array(optionSchema).max(50).optional(),
  min: z.number().finite().optional(),
  max: z.number().finite().optional(),
  minLength: z.number().int().min(0).max(5000).optional(),
  maxLength: z.number().int().min(1).max(5000).optional(),
}).strict().superRefine((field, context) => {
  if (field.type === 'select' && !field.options?.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'Select fields require at least one option' });
  }
  if (field.options && new Set(field.options.map((option) => option.value)).size !== field.options.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'Option values must be unique' });
  }
  if (field.min != null && field.max != null && field.min > field.max) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['min'], message: 'Minimum cannot exceed maximum' });
  }
  if (field.minLength != null && field.maxLength != null && field.minLength > field.maxLength) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['minLength'], message: 'Minimum length cannot exceed maximum length' });
  }
});

const extensionSchema = z.object({
  title: z.string().trim().max(120).optional(),
  description: z.string().trim().max(500).optional(),
  fields: z.array(fieldSchema).max(30).default([]),
}).strict().superRefine((schema, context) => {
  const keys = schema.fields.map((field) => field.key);
  if (new Set(keys).size !== keys.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['fields'], message: 'Field keys must be unique within a schema' });
  }
});

export const civicExtensionSchemasInput = z.record(z.string(), extensionSchema).superRefine((schemas, context) => {
  const allowedKeys = new Set<string>(['*', ...CIVIC_RECORD_KINDS]);
  Object.keys(schemas).forEach((key) => {
    if (!allowedKeys.has(key)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: 'Schema key must be * or a civic record kind' });
    }
  });
  const fieldCount = Object.values(schemas).reduce((count, schema) => count + schema.fields.length, 0);
  if (fieldCount > 60) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Tenant extension schemas may define at most 60 fields' });
  }
  if (Buffer.byteLength(JSON.stringify(schemas), 'utf8') > 50_000) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Tenant extension schema exceeds 50 KB' });
  }
});

export interface CivicExtensionIssue {
  path: string;
  message: string;
}

type ExtensionValidationResult =
  | { success: true; data: CivicExtensionValues }
  | { success: false; issues: CivicExtensionIssue[] };

export function civicExtensionFields(schemas: CivicExtensionSchemas, kind: CivicRecordKind): CivicExtensionField[] {
  const fields = new Map<string, CivicExtensionField>();
  schemas['*']?.fields.forEach((field) => fields.set(field.key, field));
  schemas[kind]?.fields.forEach((field) => fields.set(field.key, field));
  return [...fields.values()];
}

function validateString(field: CivicExtensionField, value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  const defaultMaximum = field.type === 'textarea' ? 5000 : field.type === 'url' ? 2000 : 500;
  const minimum = field.minLength ?? 0;
  const maximum = field.maxLength ?? defaultMaximum;
  return normalized.length >= minimum && normalized.length <= maximum ? normalized : null;
}

export function validateCivicExtensions(
  rawSchemas: unknown,
  kind: CivicRecordKind,
  rawValues: unknown,
  requireAll = true,
): ExtensionValidationResult {
  const parsedSchemas = civicExtensionSchemasInput.safeParse(rawSchemas || {});
  if (!parsedSchemas.success) {
    return { success: false, issues: [{ path: 'extensions', message: 'Tenant extension configuration is invalid' }] };
  }
  if (!rawValues || typeof rawValues !== 'object' || Array.isArray(rawValues)) {
    return { success: false, issues: [{ path: 'extensions', message: 'Extension values must be an object' }] };
  }
  if (Buffer.byteLength(JSON.stringify(rawValues), 'utf8') > 32_000) {
    return { success: false, issues: [{ path: 'extensions', message: 'Extension values exceed 32 KB' }] };
  }

  const fields = civicExtensionFields(parsedSchemas.data, kind);
  const byKey = new Map(fields.map((field) => [field.key, field]));
  const values = rawValues as Record<string, unknown>;
  const issues: CivicExtensionIssue[] = [];
  const data: CivicExtensionValues = {};

  Object.keys(values).forEach((key) => {
    if (!byKey.has(key)) issues.push({ path: `extensions.${key}`, message: 'Field is not configured for this tenant and record type' });
  });

  fields.forEach((field) => {
    const value = values[field.key];
    const missing = value == null || value === '';
    if (missing) {
      if (requireAll && field.required) issues.push({ path: `extensions.${field.key}`, message: `${field.label} is required` });
      return;
    }
    if (field.type === 'boolean') {
      if (typeof value === 'boolean') data[field.key] = value;
      else issues.push({ path: `extensions.${field.key}`, message: `${field.label} must be true or false` });
      return;
    }
    if (field.type === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value) || (field.min != null && value < field.min) || (field.max != null && value > field.max)) {
        issues.push({ path: `extensions.${field.key}`, message: `${field.label} is outside its allowed numeric range` });
      } else data[field.key] = value;
      return;
    }
    const normalized = validateString(field, value);
    if (normalized == null) {
      issues.push({ path: `extensions.${field.key}`, message: `${field.label} has an invalid length or value type` });
      return;
    }
    if (field.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      issues.push({ path: `extensions.${field.key}`, message: `${field.label} must use YYYY-MM-DD` });
      return;
    }
    if (field.type === 'url') {
      try {
        const url = new URL(normalized);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported protocol');
      } catch {
        issues.push({ path: `extensions.${field.key}`, message: `${field.label} must be an HTTP or HTTPS URL` });
        return;
      }
    }
    if (field.type === 'select' && !field.options?.some((option) => option.value === normalized)) {
      issues.push({ path: `extensions.${field.key}`, message: `${field.label} must use a configured option` });
      return;
    }
    data[field.key] = normalized;
  });

  return issues.length ? { success: false, issues } : { success: true, data };
}
