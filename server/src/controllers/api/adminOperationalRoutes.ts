import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import constants from '../../models/constants';
import { logEntryEvent } from '../../services/entryEventsService';
import {
  listOperationalData,
  updateAlertRule,
  updateAlertState,
} from '../../services/operationalTelemetryService';

function actorId(req: WikitruthRequest): string {
  return String(req.user?._id || req.user?.id || '');
}

export function registerAdminOperationalRoutes(
  router: Router,
  ensureAdmin: (req: WikitruthRequest, res: WikitruthResponse) => boolean,
) {
  router.get('/operational-telemetry', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res)) return;
    const data = await listOperationalData({
      eventLimit: Number(req.query.eventLimit || 30),
      historyLimit: Number(req.query.historyLimit || 48),
      alertLimit: Number(req.query.alertLimit || 50),
    });
    res.json({ success: true, telemetry: data });
  });

  router.put('/operational-telemetry/rules/:id', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res)) return;
    let rule;
    try {
      rule = await updateAlertRule(String(req.params.id || ''), (req.body || {}) as Record<string, unknown>);
    } catch (error) {
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Invalid alert rule' });
      return;
    }
    if (!rule) {
      res.status(404).json({ success: false, message: 'Alert rule not found' });
      return;
    }
    await logEntryEvent({
      scope: 'privileged', eventType: 'operational.alert_rule.updated',
      objectType: constants.OBJECT_TYPES.user, objectName: 'operational-alert-rule',
      objectId: String(rule._id || actorId(req)), actorUserId: actorId(req),
      actorUsername: String(req.user?.username || ''), message: 'Operational alert rule updated',
      payload: {
        ruleId: String(rule._id || ''), enabled: rule.enabled, threshold: rule.threshold,
        windowMinutes: rule.windowMinutes, cooldownMinutes: rule.cooldownMinutes, severity: rule.severity,
      },
    });
    res.json({ success: true, rule });
  });

  router.post('/operational-telemetry/alerts/:id/actions', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res)) return;
    const action = req.body?.action === 'resolve' ? 'resolve' : req.body?.action === 'acknowledge' ? 'acknowledge' : null;
    if (!action) {
      res.status(400).json({ success: false, message: 'action must be acknowledge or resolve' });
      return;
    }
    const acknowledgement = String(req.body?.acknowledgement || '').trim();
    if (acknowledgement.length < 3 || acknowledgement.length > 240) {
      res.status(400).json({ success: false, message: 'An acknowledgement note from 3 to 240 characters is required' });
      return;
    }
    const alert = await updateAlertState(String(req.params.id || ''), {
      action, userId: actorId(req), acknowledgement,
    });
    if (!alert) {
      res.status(404).json({ success: false, message: 'Operational alert not found' });
      return;
    }
    await logEntryEvent({
      scope: 'privileged', eventType: `operational.alert.${action === 'resolve' ? 'resolved' : 'acknowledged'}`,
      objectType: constants.OBJECT_TYPES.user, objectName: 'operational-alert',
      objectId: String(alert._id || actorId(req)), actorUserId: actorId(req),
      actorUsername: String(req.user?.username || ''), message: `Operational alert ${action}d`,
      payload: { alertId: String(alert._id || ''), action, acknowledgement: alert.acknowledgement },
    });
    res.json({ success: true, alert });
  });
}
