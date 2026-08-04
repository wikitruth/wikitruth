import crypto from 'crypto';

import appModForDb from '../app';
import { createNotification } from './notificationsService';

export type OperationalSeverity = 'info' | 'warning' | 'error' | 'critical';
export type HealthState = 'healthy' | 'attention' | 'unavailable' | 'unknown';

type EventInput = {
  kind: string;
  severity: OperationalSeverity;
  source: string;
  code?: unknown;
  message?: unknown;
  path?: unknown;
  requestId?: unknown;
  occurredAt?: unknown;
};

type HealthInput = {
  overall?: unknown;
  generatedAt?: unknown;
  components?: Record<string, { status?: unknown; summary?: unknown }>;
};

type OperationalRule = {
  _id?: unknown;
  name?: unknown;
  enabled?: unknown;
  source?: unknown;
  metric?: unknown;
  threshold?: unknown;
  windowMinutes?: unknown;
  cooldownMinutes?: unknown;
  severity?: unknown;
};

type OperationalAlert = {
  _id?: unknown;
  status?: unknown;
  lastTriggeredAt?: unknown;
};

type Chain<T> = {
  sort: (value: Record<string, 1 | -1>) => Chain<T>;
  limit: (value: number) => Chain<T>;
  lean: () => Promise<T[]>;
};

type TelemetryModels = {
  OperationalEvent: {
    create: (value: Record<string, unknown>) => Promise<Record<string, unknown>>;
    countDocuments: (query: Record<string, unknown>) => Promise<number>;
    find: (query: Record<string, unknown>) => Chain<Record<string, unknown>>;
  };
  HealthSnapshot: {
    create: (value: Record<string, unknown>) => Promise<Record<string, unknown>>;
    find: (query: Record<string, unknown>) => Chain<Record<string, unknown>>;
  };
  OperationalAlertRule: {
    find: (query: Record<string, unknown>) => Chain<OperationalRule>;
    updateOne: (query: Record<string, unknown>, update: Record<string, unknown>, options?: Record<string, unknown>) => Promise<unknown>;
    findByIdAndUpdate: (id: unknown, update: Record<string, unknown>, options: Record<string, unknown>) => { lean: () => Promise<Record<string, unknown> | null> };
  };
  OperationalAlert: {
    create: (value: Record<string, unknown>) => Promise<Record<string, unknown>>;
    findOne: (query: Record<string, unknown>) => { sort: (value: Record<string, 1 | -1>) => { lean: () => Promise<OperationalAlert | null> } };
    find: (query: Record<string, unknown>) => Chain<Record<string, unknown>>;
    findByIdAndUpdate: (id: unknown, update: Record<string, unknown>, options: Record<string, unknown>) => { lean: () => Promise<Record<string, unknown> | null> };
    updateMany: (query: Record<string, unknown>, update: Record<string, unknown>) => Promise<unknown>;
  };
  User: {
    find: (query: Record<string, unknown>) => { select: (value: string) => { lean: () => Promise<Array<{ _id?: unknown }>> } };
  };
};

const db = (appModForDb as unknown as { db: { models: TelemetryModels } }).db.models;
const EVENT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const SNAPSHOT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const ALERT_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;
const allowedHealthStates = new Set(['healthy', 'attention', 'unavailable', 'unknown']);

const defaultRules = [
  { name: 'MongoDB unavailable', source: 'health', metric: 'component.mongo', threshold: 3, windowMinutes: 5, cooldownMinutes: 30, severity: 'critical' },
  { name: 'Low storage or storage unavailable', source: 'health', metric: 'component.storage', threshold: 2, windowMinutes: 5, cooldownMinutes: 60, severity: 'critical' },
  { name: 'System needs attention', source: 'health', metric: 'overall', threshold: 2, windowMinutes: 10, cooldownMinutes: 60, severity: 'warning' },
  { name: 'Repeated server errors', source: 'events', metric: 'api_error', threshold: 5, windowMinutes: 15, cooldownMinutes: 30, severity: 'critical' },
  { name: 'Repeated client errors', source: 'events', metric: 'client_error', threshold: 10, windowMinutes: 15, cooldownMinutes: 60, severity: 'warning' },
] as const;

function limited(value: unknown, length: number): string {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, length);
}

export function sanitizeOperationalText(value: unknown, fallback = 'Operational event'): string {
  const sanitized = limited(value, 1000)
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/\b(?:eyJ[A-Za-z0-9_-]+\.){2}[A-Za-z0-9_-]+\b/g, '[token]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
    .replace(/\b(?:password|secret|token|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/(?:[A-Za-z]:\\|\/(?:Users|home|var|opt|srv)\/)[^\s]+/g, '[path]')
    .replace(/\b[0-9a-f]{24}\b/gi, ':id')
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, ':id');
  return limited(sanitized, 240) || fallback;
}

export function sanitizeOperationalPath(value: unknown): string {
  const raw = limited(value, 500);
  if (!raw) return '';
  let pathname = raw.split(/[?#]/)[0];
  try {
    pathname = new URL(raw, 'https://wikitruth.invalid').pathname;
  } catch (_error) {
    // Use the query-free relative path above.
  }
  return limited(pathname, 240)
    .replace(/\b[0-9a-f]{24}\b/gi, ':id')
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, ':id');
}

function safeToken(value: unknown, fallback: string): string {
  return limited(value, 80).replace(/[^a-z0-9_.:-]/gi, '_') || fallback;
}

function safeDate(value: unknown, now = new Date()): Date {
  const candidate = value ? new Date(String(value)) : now;
  return Number.isFinite(candidate.getTime()) && Math.abs(candidate.getTime() - now.getTime()) < 24 * 60 * 60 * 1000
    ? candidate : now;
}

export function normalizeOperationalEvent(input: EventInput, now = new Date()) {
  const kind = safeToken(input.kind, 'runtime_error');
  const source = safeToken(input.source, 'application');
  const code = safeToken(input.code, 'unknown');
  const message = sanitizeOperationalText(input.message);
  const path = sanitizeOperationalPath(input.path);
  const fingerprint = crypto.createHash('sha256').update([kind, source, code, message, path].join('|')).digest('hex');
  return {
    kind,
    severity: input.severity,
    source,
    code,
    message,
    path,
    requestId: safeToken(input.requestId, ''),
    fingerprint,
    occurredAt: safeDate(input.occurredAt, now),
    expiresAt: new Date(now.getTime() + EVENT_RETENTION_MS),
  };
}

function healthScore(status: unknown): number {
  return status === 'unavailable' ? 3 : status === 'attention' ? 2 : status === 'unknown' ? 1 : 0;
}

export function evaluateHealthMetric(ruleMetric: string, health: HealthInput): number {
  if (ruleMetric === 'overall') return healthScore(health.overall);
  if (ruleMetric.startsWith('component.')) {
    const key = ruleMetric.slice('component.'.length);
    return healthScore(health.components?.[key]?.status);
  }
  return 0;
}

async function notifyAdministrators(alert: Record<string, unknown>): Promise<void> {
  const users = await db.User.find({ isActive: 'yes', 'roles.admin': { $ne: null } }).select('_id').lean();
  await Promise.all(users.map((user) => createNotification({
    userId: String(user._id || ''),
    type: 'operational.alert',
    title: String(alert.title || 'Operational alert'),
    body: String(alert.summary || ''),
    link: '/admin/system-operations?tab=alerts',
    payload: { alertId: String(alert._id || ''), severity: alert.severity },
  })));
}

async function ensureDefaultRules(): Promise<void> {
  await Promise.all(defaultRules.map((rule) => db.OperationalAlertRule.updateOne(
    { source: rule.source, metric: rule.metric },
    { $setOnInsert: { ...rule, enabled: true, builtIn: true, createDate: new Date(), editDate: new Date() } },
    { upsert: true },
  )));
}

async function triggerOrRefreshAlert(rule: OperationalRule, observed: number, now: Date): Promise<void> {
  const ruleId = String(rule._id || '');
  if (!ruleId) return;
  const dedupeKey = `rule:${ruleId}`;
  const existing = await db.OperationalAlert.findOne({
    dedupeKey,
    status: { $in: ['active', 'acknowledged'] },
  }).sort({ lastTriggeredAt: -1 }).lean();
  const cooldownMs = Math.max(1, Number(rule.cooldownMinutes || 30)) * 60 * 1000;
  const lastTriggeredAt = existing?.lastTriggeredAt ? new Date(String(existing.lastTriggeredAt)) : null;
  const shouldNotify = !existing || !lastTriggeredAt || now.getTime() - lastTriggeredAt.getTime() >= cooldownMs;
  const summary = `${String(rule.name || rule.metric)} threshold ${Number(rule.threshold || 1)}; observed ${observed}.`;
  let alert: Record<string, unknown> | null;
  if (existing?._id) {
    alert = await db.OperationalAlert.findByIdAndUpdate(existing._id, {
      $set: {
        ...(shouldNotify ? { status: 'active', acknowledgedAt: null, acknowledgedBy: null, acknowledgement: '' } : {}),
        severity: rule.severity || 'warning', summary, lastTriggeredAt: now,
        expiresAt: new Date(now.getTime() + ALERT_RETENTION_MS),
      },
      $inc: { occurrenceCount: 1 },
    }, { new: true }).lean();
  } else {
    alert = await db.OperationalAlert.create({
      ruleId: rule._id, dedupeKey, status: 'active', severity: rule.severity || 'warning',
      title: String(rule.name || 'Operational alert'), summary, occurrenceCount: 1,
      firstTriggeredAt: now, lastTriggeredAt: now, expiresAt: new Date(now.getTime() + ALERT_RETENTION_MS),
    });
  }
  if (shouldNotify && alert) await notifyAdministrators(alert);
}

async function resolveRuleAlert(rule: OperationalRule, now: Date): Promise<void> {
  await db.OperationalAlert.updateMany({
    ruleId: rule._id,
    status: { $in: ['active', 'acknowledged'] },
  }, { $set: { status: 'resolved', resolvedAt: now, expiresAt: new Date(now.getTime() + ALERT_RETENTION_MS) } });
}

async function evaluateRule(rule: OperationalRule, health: HealthInput | null, now: Date): Promise<void> {
  if (!rule.enabled) return;
  let observed = 0;
  if (rule.source === 'health') {
    if (!health) return;
    observed = evaluateHealthMetric(String(rule.metric || ''), health);
  } else if (rule.source === 'events') {
    const since = new Date(now.getTime() - Math.max(1, Number(rule.windowMinutes || 15)) * 60 * 1000);
    observed = await db.OperationalEvent.countDocuments({ kind: String(rule.metric || ''), occurredAt: { $gte: since } });
  }
  if (observed >= Number(rule.threshold || 1)) await triggerOrRefreshAlert(rule, observed, now);
  else await resolveRuleAlert(rule, now);
}

async function evaluateRules(health: HealthInput | null, now = new Date()): Promise<void> {
  await ensureDefaultRules();
  const rules = await db.OperationalAlertRule.find({ enabled: true }).sort({ source: 1, metric: 1 }).limit(100).lean();
  await Promise.all(rules.map((rule) => evaluateRule(rule, health, now)));
}

export async function recordOperationalEvent(input: EventInput): Promise<Record<string, unknown>> {
  const event = normalizeOperationalEvent(input);
  const created = await db.OperationalEvent.create(event);
  await evaluateRules(null);
  return created;
}

export async function captureHealthSnapshot(health: HealthInput): Promise<Record<string, unknown>> {
  const now = new Date();
  const components = Object.entries(health.components || {}).slice(0, 30).map(([key, component]) => ({
    key: safeToken(key, 'component'),
    status: allowedHealthStates.has(String(component.status)) ? String(component.status) : 'unknown',
    summary: sanitizeOperationalText(component.summary, 'No summary available'),
  }));
  const snapshot = {
    overall: allowedHealthStates.has(String(health.overall)) ? String(health.overall) : 'unknown',
    components,
    generatedAt: safeDate(health.generatedAt, now),
    expiresAt: new Date(now.getTime() + SNAPSHOT_RETENTION_MS),
  };
  const created = await db.HealthSnapshot.create(snapshot);
  await evaluateRules(health, now);
  return created;
}

export async function listOperationalData(options: { eventLimit?: number; historyLimit?: number; alertLimit?: number } = {}) {
  await ensureDefaultRules();
  const [events, history, rules, alerts] = await Promise.all([
    db.OperationalEvent.find({}).sort({ occurredAt: -1 }).limit(Math.min(100, Math.max(1, options.eventLimit || 30))).lean(),
    db.HealthSnapshot.find({}).sort({ generatedAt: -1 }).limit(Math.min(168, Math.max(1, options.historyLimit || 48))).lean(),
    db.OperationalAlertRule.find({}).sort({ source: 1, metric: 1 }).limit(100).lean(),
    db.OperationalAlert.find({}).sort({ lastTriggeredAt: -1 }).limit(Math.min(100, Math.max(1, options.alertLimit || 50))).lean(),
  ]);
  return { events, history, rules, alerts, retention: { eventsDays: 30, healthDays: 90, alertsDays: 180 } };
}

export async function updateAlertRule(ruleId: string, input: Record<string, unknown>) {
  function boundedNumber(value: unknown, minimum: number, maximum: number, label: string): number {
    const number = Number(value);
    if (!Number.isFinite(number) || !Number.isInteger(number) || number < minimum || number > maximum) {
      throw new Error(`${label} must be an integer from ${minimum} to ${maximum}`);
    }
    return number;
  }
  const allowed = {
    enabled: Boolean(input.enabled),
    threshold: boundedNumber(input.threshold, 1, 10000, 'threshold'),
    windowMinutes: boundedNumber(input.windowMinutes, 1, 1440, 'windowMinutes'),
    cooldownMinutes: boundedNumber(input.cooldownMinutes, 1, 10080, 'cooldownMinutes'),
    severity: input.severity === 'critical' ? 'critical' : 'warning',
    editDate: new Date(),
  };
  return db.OperationalAlertRule.findByIdAndUpdate(ruleId, { $set: allowed }, { new: true }).lean();
}

export async function updateAlertState(
  alertId: string,
  input: { action: 'acknowledge' | 'resolve'; userId: string; acknowledgement?: string },
) {
  const now = new Date();
  const acknowledgement = sanitizeOperationalText(input.acknowledgement, 'Reviewed by an administrator');
  const update = input.action === 'resolve' ? {
    status: 'resolved', resolvedAt: now, resolvedBy: input.userId, acknowledgement,
  } : {
    status: 'acknowledged', acknowledgedAt: now, acknowledgedBy: input.userId, acknowledgement,
  };
  return db.OperationalAlert.findByIdAndUpdate(alertId, {
    $set: { ...update, expiresAt: new Date(now.getTime() + ALERT_RETENTION_MS) },
  }, { new: true }).lean();
}
