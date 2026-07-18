'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import constants from '../../models/constants';
import {
  computeChannelConsensus,
  DEFAULT_VERDICT_CONSENSUS_POLICY,
  type VerdictChannel,
} from '../../services/verdictConsensusService';
import {
  db,
  ensureAdmin,
  getVerdictChannelStatuses,
  parseModerationTarget,
} from './moderationShared';
import { writeVerdictDecision } from './verdictDecisionWriter';

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
  const results = [];
  for (const parsed of parsedChannels) {
    const votes = await db.VerdictVote.find({
      objectType: target.objectType,
      objectId: target.id,
      channel: parsed.channel,
    }).lean();
    const consensus = computeChannelConsensus(parsed.channel, votes);
    const result = await writeVerdictDecision({
      req,
      target,
      channel: parsed.channel,
      status: parsed.status,
      reasoning: parsed.reasoning,
      framework: parsed.framework,
      evidenceRefs: parsed.evidenceRefs,
      decisionMode: 'admin_override',
      policyVersion: DEFAULT_VERDICT_CONSENSUS_POLICY.version,
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
  router.put('/verdict-channel', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) return;
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
