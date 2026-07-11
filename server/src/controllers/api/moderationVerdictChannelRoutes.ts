'use strict';

import type { Router } from 'express';

import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import constants from '../../models/constants';
import { logEntryEvent } from '../../services/entryEventsService';
import {
  ensureReviewerOrAdmin,
  getDbModelByObjectType,
  getVerdictChannelStatuses,
  mapFactualVerdictToLegacy,
  parseModerationTarget,
  toModerationEntry,
} from './moderationShared';
import { recordEntryRevision } from './revisionWriteRecorder';

type VerdictChannel = 'factual' | 'ethical';
type ParsedChannel = {
  channel: VerdictChannel;
  status: string;
  reasoning: string;
  framework: string;
  evidenceRefs: string[];
};

type EditableVerdictEntry = Record<string, unknown> & {
  verdicts?: Record<string, Record<string, unknown>>;
  verdict?: Record<string, unknown>;
  editDate?: Date;
  editUserId?: unknown;
  save: () => Promise<unknown>;
  toObject: () => Record<string, unknown>;
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
    ? input.evidenceRefs
      .map((id: unknown) => String(id || '').trim())
      .filter((id: string) => /^[a-f\d]{24}$/i.test(id))
    : [];
  return { value: { channel, status, reasoning, framework, evidenceRefs } };
}

function applyChannel(entry: EditableVerdictEntry, parsed: ParsedChannel, userId: unknown, now: Date): void {
  entry.verdicts = entry.verdicts || {};
  entry.verdicts[parsed.channel] = {
    ...(entry.verdicts[parsed.channel] || {}),
    status: parsed.status,
    reasoning: parsed.reasoning,
    ...(parsed.channel === 'ethical' ? { framework: parsed.framework } : {}),
    evidenceRefs: parsed.evidenceRefs,
    editDate: now,
    editUserId: userId,
  };
  if (parsed.channel === 'factual') {
    entry.verdict = {
      ...(entry.verdict || {}),
      status: mapFactualVerdictToLegacy(parsed.status),
      reasoning: parsed.reasoning,
      editDate: now,
      editUserId: userId,
    };
  }
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

async function saveChannels(
  req: WikitruthRequest,
  res: WikitruthResponse,
  parsedChannels: ParsedChannel[],
): Promise<void> {
  const target = getSupportedTarget(req, res);
  if (!target) {
    return;
  }
  const dbModel = getDbModelByObjectType(target.objectType);
  const entry = dbModel ? await dbModel.findById(target.id) : null;
  if (!entry) {
    res.status(404).json({ success: false, message: 'Entry not found' });
    return;
  }
  const now = new Date();
  const userId = req.user?.id || req.user?._id;
  parsedChannels.forEach((parsed) => applyChannel(entry, parsed, userId, now));
  entry.editDate = now;
  entry.editUserId = userId;
  await entry.save();
  const channelNames = parsedChannels.map((parsed) => parsed.channel);
  await recordEntryRevision({
    req,
    objectType: target.objectType,
    entry,
    source: 'update',
    summary: channelNames.length === 2 ? 'Factual and ethical verdicts updated' : `${channelNames[0] === 'factual' ? 'Factual' : 'Ethical'} verdict updated`,
  });
  await logEntryEvent({
    scope: 'privileged',
    eventType: channelNames.length === 2 ? 'moderation.verdict.channels.updated' : `moderation.verdict.${channelNames[0]}.updated`,
    objectType: target.objectType,
    objectName: target.objectName,
    objectId: target.id,
    actorUserId: String(userId || ''),
    actorUsername: String(req.user?.username || ''),
    message: parsedChannels.map((parsed) => `${parsed.channel} verdict updated to ${parsed.status}`).join('; '),
    payload: { channels: parsedChannels },
  });
  res.json({
    success: true,
    target,
    entry: toModerationEntry(entry.toObject(), target),
    verdictChannelStatuses: getVerdictChannelStatuses(),
  });
}

export function registerModerationVerdictChannelRoutes(router: Router): void {
  router.put('/verdict-channel', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureReviewerOrAdmin(req, res)) {
      return;
    }
    const channel = String(req.body?.channel || '').trim().toLowerCase();
    if (channel !== 'factual' && channel !== 'ethical') {
      res.status(400).json({ success: false, message: 'Channel must be factual or ethical' });
      return;
    }
    const parsed = parseChannelPayload(channel, req.body);
    if (!parsed.value) {
      res.status(400).json({ success: false, message: parsed.error });
      return;
    }
    await saveChannels(req, res, [parsed.value]);
  });

  router.put('/verdict-channels', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureReviewerOrAdmin(req, res)) {
      return;
    }
    const factual = parseChannelPayload('factual', req.body?.factual);
    const ethical = parseChannelPayload('ethical', req.body?.ethical);
    if (!factual.value || !ethical.value) {
      res.status(400).json({ success: false, message: factual.error || ethical.error });
      return;
    }
    await saveChannels(req, res, [factual.value, ethical.value]);
  });
}
