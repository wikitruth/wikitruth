jest.mock('../../server/src/app', () => ({
  db: { models: {} },
}));
jest.mock('../../server/src/services/notificationsService', () => ({
  createNotification: jest.fn(),
}));

import {
  evaluateHealthMetric,
  normalizeOperationalEvent,
  sanitizeOperationalPath,
  sanitizeOperationalText,
} from '../../server/src/services/operationalTelemetryService';

describe('operational telemetry sanitization', () => {
  it('redacts credentials, email addresses, tokens, ids, and local paths', () => {
    const value = sanitizeOperationalText(
      'email ada@example.com token=secret123 Bearer abc.def.ghi /Users/ada/project/file.ts 507f1f77bcf86cd799439011',
    );
    expect(value).not.toContain('ada@example.com');
    expect(value).not.toContain('secret123');
    expect(value).not.toContain('/Users/ada');
    expect(value).not.toContain('507f1f77bcf86cd799439011');
    expect(value).toContain('[email]');
    expect(value).toContain('[redacted]');
  });

  it('removes query data and normalizes identifiers in request paths', () => {
    expect(sanitizeOperationalPath('/api/users/507f1f77bcf86cd799439011?token=private'))
      .toBe('/api/users/:id');
  });

  it('creates a bounded event without raw stack or user-agent fields', () => {
    const event = normalizeOperationalEvent({
      kind: 'api error', severity: 'error', source: 'express api', code: 'E_FAIL',
      message: 'Failure for user@example.com', path: '/api/private?email=user@example.com',
      requestId: 'request-1', occurredAt: '2026-08-04T00:00:00.000Z',
    }, new Date('2026-08-04T00:00:01.000Z'));
    expect(event).toMatchObject({ kind: 'api_error', source: 'express_api', code: 'E_FAIL', path: '/api/private' });
    expect(event.message).toBe('Failure for [email]');
    expect(event.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(event).not.toHaveProperty('stack');
    expect(event).not.toHaveProperty('userAgent');
  });

  it('evaluates only bounded health status metrics', () => {
    const health = { overall: 'attention', components: { mongo: { status: 'unavailable' } } };
    expect(evaluateHealthMetric('overall', health)).toBe(2);
    expect(evaluateHealthMetric('component.mongo', health)).toBe(3);
    expect(evaluateHealthMetric('component.privateData', health)).toBe(0);
  });
});
