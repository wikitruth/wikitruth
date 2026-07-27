'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import constants from '../../models/constants';
import {
  computeChannelConsensus,
  normalizeVerdictSensitivity,
  verdictPolicyForSensitivity,
  type VerdictChannel,
} from '../../services/verdictConsensusService';
import {
  db,
  ensureAdmin,
  getDbModelByObjectType,
  getVerdictChannelStatuses,
  parseModerationTarget,
} from './moderationShared';
import { writeVerdictDecision } from './verdictDecisionWriter';
import { requirePrivilegedPasskeyAssurance } from '../../services/privilegedAuthService';

type ParsedChannel = {
  channel: VerdictChannel;
  status: string;
  reasoning: string;
  framework: string;
  evidenceRefs: string[];
};

function parseChannelPayload(channel: VerdictChannel, value: unknown): { value?: ParsedChannel; error?: string } {
  const input = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const status = String(input.status || '').trim().toLowerCase();
  const channelStatuses = getVerdictChannelStatuses();
  if (!(channelStatuses[channel] as readonly string[]).includes(status)) {
    return { error: `Unsupported ${channel} verdict status` };
  }
  const reasoning = String(input.reasoning || '').trim();
  const framework = String(input.framework || '').trim();
  if (status !== 'pending' && status !== 'not_applicable' && reasoning.length < 10) {
    return { error: 'Verdict reasoning must be at least 10 characters' };
  }
  if (channel === 'ethical' && !['pending', 'not_applicable'].includes(status) && framework.length < 3) {
    return { error: 'An ethical framework or principle is required' };
  }
  const evidenceRefs = Array.isArray(input.evidenceRefs)
    ? Array.from(new Set(input.evidenceRefs
      .map((id: unknown) => String(id || '').trim())
      .filter((id: string) => /^[a-f\d]{24}$/i.test(id))))
    : [];
  return { value: { channel, status, reasoning, framework, evidenceRefs } };
}

function getSupportedTarget(req: WikitruthRequest, res: WikitruthResponse) {
  const target = parseModerationTarget(req);
  if (!target || ![
    constants.OBJECT_TYPES.topic,
    constants.OBJECT_TYPES.argument,
    constants.OBJECT_TYPES.answer,
  ].includes(target.objectType)) {
    res.status(400).json({ success: false, message: 'Verdict channels are supported for topics, arguments, and answers' });
    return null;
  }
  return target;
}

function parseOverride(req: WikitruthRequest): { reason?: string; error?: string } {
  if (req.body?.acknowledgeOverride !== true) {
    return { error: 'Administrator final-say acknowledgement is required' };
  }
  const reason = String(req.body?.overrideReason || '').trim();
  if (reason.length < 10) return { error: 'Administrator override reason must be at least 10 characters' };
  return { reason };
}

async function applyOverrides(
  req: WikitruthRequest,
  res: WikitruthResponse,
  parsedChannels: ParsedChannel[],
  overrideReason: string,
): Promise<void> {
  const target = getSupportedTarget(req, res);
  if (!target) return;
  const model = getDbModelByObjectType(target.objectType);
  const policyEntry = model?.findById
    ? await model.findById(target.id).select('extras.verdictSensitivity').lean()
    : null;
  const policy = verdictPolicyForSensitivity(policyEntry?.extras?.verdictSensitivity);
  const results = [];
  for (const parsed of parsedChannels) {
    const votes = await db.VerdictVote.find({
      objectType: target.objectType,
      objectId: target.id,
      channel: parsed.channel,
    }).lean();
    const consensus = computeChannelConsensus(parsed.channel, votes, policy);
    const result = await writeVerdictDecision({
      req,
      target,
      channel: parsed.channel,
      status: parsed.status,
      reasoning: parsed.reasoning,
      framework: parsed.framework,
      evidenceRefs: parsed.evidenceRefs,
      decisionMode: 'admin_override',
      policyVersion: policy.version,
      overrideReason,
      consensusSnapshot: consensus,
    });
    if (!result.published) {
      res.status(404).json({ success: false, message: 'Entry not found' });
      return;
    }
    results.push({ channel: parsed.channel, entry: result.entry });
  }
  res.json({ success: true, target, results, entry: results.at(-1)?.entry });
}

export function registerModerationVerdictChannelRoutes(router: Router): void {
  router.put('/verdict-policy', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) return;
    if (!(await requirePrivilegedPasskeyAssurance(req, res))) return;
    const target = getSupportedTarget(req, res);
    if (!target) return;
    const rawSensitivity = String(req.body?.sensitivity || '').trim().toLowerCase();
    if (!['standard', 'elevated', 'critical'].includes(rawSensitivity)) {
      res.status(400).json({ success: false, message: 'Sensitivity must be standard, elevated, or critical' });
      return;
    }
    const model = getDbModelByObjectType(target.objectType);
    const entry = model ? await model.findById(target.id) : null;
    if (!entry) {
      res.status(404).json({ success: false, message: 'Entry not found' });
      return;
    }
    entry.extras = { ...(entry.extras || {}), verdictSensitivity: normalizeVerdictSensitivity(rawSensitivity) };
    entry.markModified?.('extras');
    entry.editDate = new Date();
    entry.editUserId = req.user?.id || req.user?._id;
    await entry.save();
    const policy = verdictPolicyForSensitivity(rawSensitivity);
    res.json({ success: true, target, sensitivity: policy.sensitivity, policy });
  });

  router.put('/verdict-channel', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) return;
    if (!(await requirePrivilegedPasskeyAssurance(req, res))) return;
    const channel = String(req.body?.channel || '').trim().toLowerCase();
    if (channel !== 'factual' && channel !== 'ethical') {
      res.status(400).json({ success: false, message: 'Channel must be factual or ethical' });
      return;
    }
    const parsed = parseChannelPayload(channel, req.body);
    const override = parseOverride(req);
    if (!parsed.value || !override.reason) {
      res.status(400).json({ success: false, message: parsed.error || override.error });
      return;
    }
    await applyOverrides(req, res, [parsed.value], override.reason);
  });

  router.put('/verdict-channels', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) return;
    if (!(await requirePrivilegedPasskeyAssurance(req, res))) return;
    const factual = parseChannelPayload('factual', req.body?.factual);
    const ethical = parseChannelPayload('ethical', req.body?.ethical);
    const override = parseOverride(req);
    if (!factual.value || !ethical.value || !override.reason) {
      res.status(400).json({ success: false, message: factual.error || ethical.error || override.error });
      return;
    }
    await applyOverrides(req, res, [factual.value, ethical.value], override.reason);
  });
}
