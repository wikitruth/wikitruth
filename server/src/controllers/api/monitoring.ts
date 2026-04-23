'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';

import * as logger from '../../utils/logger';
import { publishRealtimeEvent } from '../../services/realtimeEvents';

type MonitoringPayload = {
  type?: string;
  message?: string;
  stack?: string;
  path?: string;
  userAgent?: string;
  timestamp?: string;
};

type CspPayload = {
  ['csp-report']?: {
    'document-uri'?: string;
    'violated-directive'?: string;
    'effective-directive'?: string;
    'blocked-uri'?: string;
    'original-policy'?: string;
    disposition?: string;
    sourceFile?: string;
    lineNumber?: number;
    columnNumber?: number;
  };
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_EVENTS = 120;
const requestRateWindow = new Map<string, { count: number; resetAt: number }>();

function readOriginHost(req: WikitruthRequest): string | null {
  const origin = String(req.get('origin') || '').trim();
  if (!origin) {
    return null;
  }
  try {
    return new URL(origin).host.toLowerCase();
  } catch (_err) {
    return '';
  }
}

function readRefererHost(req: WikitruthRequest): string | null {
  const referer = String(req.get('referer') || '').trim();
  if (!referer) {
    return null;
  }
  try {
    return new URL(referer).host.toLowerCase();
  } catch (_err) {
    return '';
  }
}

function isTrustedOrigin(req: WikitruthRequest): boolean {
  const expectedHost = String(req.get('host') || '').trim().toLowerCase();
  if (!expectedHost) {
    return false;
  }

  const originHost = readOriginHost(req);
  if (originHost !== null) {
    return originHost.length > 0 && originHost === expectedHost;
  }

  const refererHost = readRefererHost(req);
  if (refererHost !== null) {
    return refererHost.length > 0 && refererHost === expectedHost;
  }

  // Some beacon clients omit both headers; treat as trusted same-origin fallback.
  return true;
}

function isJsonContentType(req: WikitruthRequest): boolean {
  const contentType = String(req.get('content-type') || '').toLowerCase();
  return contentType.startsWith('application/json');
}

function isCspContentType(req: WikitruthRequest): boolean {
  const contentType = String(req.get('content-type') || '').toLowerCase();
  return (
    contentType.startsWith('application/json') ||
    contentType.startsWith('application/csp-report') ||
    contentType.startsWith('application/reports+json')
  );
}

function isRateLimited(req: WikitruthRequest): boolean {
  const now = Date.now();
  const key = String(req.ip || 'unknown');
  const current = requestRateWindow.get(key);

  if (!current || current.resetAt <= now) {
    requestRateWindow.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (current.count >= RATE_LIMIT_MAX_EVENTS) {
    return true;
  }

  current.count += 1;
  requestRateWindow.set(key, current);
  return false;
}

export = function (router: Router) {
  router.post('/errors', function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!isTrustedOrigin(req)) {
      res.status(403).json({ error: 'Untrusted origin' });
      return;
    }
    if (!isJsonContentType(req)) {
      res.status(415).json({ error: 'Content-Type must be application/json' });
      return;
    }
    if (isRateLimited(req)) {
      res.status(429).json({ error: 'Too many monitoring events' });
      return;
    }

    const bodyCandidate = req.body;
    const body: MonitoringPayload =
      bodyCandidate && typeof bodyCandidate === 'object'
        ? (bodyCandidate as MonitoringPayload)
        : {};
    const requestId = req.requestId || null;

    logger.error('client.runtime.error', {
      requestId: requestId,
      source: 'react-client',
      eventType: body.type || 'unknown',
      message: body.message || 'unknown',
      stack: body.stack || null,
      path: body.path || req.path,
      userAgent: body.userAgent || req.get('user-agent') || null,
      timestamp: body.timestamp || new Date().toISOString(),
    });

    publishRealtimeEvent({
      type: 'monitoring.error',
      requestId: requestId,
      data: {
        eventType: body.type || 'unknown',
        message: body.message || 'unknown',
        path: body.path || req.path,
      },
    });

    res.status(202).json({ success: true });
  });

  router.post('/csp', function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!isTrustedOrigin(req)) {
      res.status(403).json({ error: 'Untrusted origin' });
      return;
    }
    if (!isCspContentType(req)) {
      res.status(415).json({ error: 'Unsupported Content-Type for CSP report' });
      return;
    }
    if (isRateLimited(req)) {
      res.status(429).json({ error: 'Too many monitoring events' });
      return;
    }

    const bodyCandidate = req.body as CspPayload | Array<Record<string, unknown>> | null;
    const cspReport =
      bodyCandidate && typeof bodyCandidate === 'object' && !Array.isArray(bodyCandidate)
        ? bodyCandidate['csp-report'] || (bodyCandidate as Record<string, unknown>)
        : Array.isArray(bodyCandidate)
          ? bodyCandidate[0] || {}
          : {};

    const report = (cspReport || {}) as Record<string, unknown>;
    const requestId = req.requestId || null;

    logger.error('client.csp.violation', {
      requestId: requestId,
      source: 'react-client',
      documentUri: String(report['document-uri'] || report.document_uri || req.get('referer') || ''),
      violatedDirective: String(
        report['violated-directive'] || report['effective-directive'] || report.effective_directive || '',
      ),
      blockedUri: String(report['blocked-uri'] || report.blocked_uri || ''),
      originalPolicy: String(report['original-policy'] || report.original_policy || ''),
      disposition: String(report.disposition || ''),
      userAgent: req.get('user-agent') || null,
      timestamp: new Date().toISOString(),
    });

    publishRealtimeEvent({
      type: 'monitoring.csp',
      requestId: requestId,
      data: {
        violatedDirective: report['violated-directive'] || report['effective-directive'] || null,
        blockedUri: report['blocked-uri'] || null,
      },
    });

    res.status(202).json({ success: true });
  });
};
