'use strict';

import { randomBytes } from 'crypto';
import type { Application } from 'express';
import { toApiClientIdentity } from './apiClientService';
import { executeAgentCommand, type AgentExecutionContext } from './agentCommandExecution';
import { publishRealtimeEvent } from './realtimeEvents';
import { recordAgentOperationEvent } from './agentObservabilityService';

const LEASE_MS = 5 * 60 * 1000;
const workerId = `${process.pid}-${randomBytes(6).toString('hex')}`;
const scheduledJobs = new Set<string>();

function models(app: Application): Record<string, any> {
  return (app as unknown as { db?: { models?: Record<string, any> } }).db?.models || {};
}

async function jobContext(app: Application, job: Record<string, any>): Promise<AgentExecutionContext | null> {
  const db = models(app);
  const [client, user] = await Promise.all([
    db.ApiClient.findById(job.apiClientId),
    db.User.findById(job.accountableUserId),
  ]);
  if (!client || client.status !== 'active' || !user || (user.isActive && user.isActive !== 'yes')) return null;
  return {
    app,
    apiClient: toApiClientIdentity(client.toObject ? client.toObject() : client),
    user,
    agentRun: {
      runId: String(job.agentRunId || ''), model: String(job.agentModel || ''),
      provider: String(job.agentProvider || ''), purpose: String(job.agentPurpose || ''),
      sourceManifest: Array.isArray(job.sourceManifest) ? job.sourceManifest : [],
    },
  };
}

function jobEvent(job: Record<string, any>, type: string, data: Record<string, unknown> = {}): void {
  publishRealtimeEvent({
    type,
    data: {
      apiClientId: String(job.apiClientId || ''), agentRunId: String(job.agentRunId || ''),
      jobId: String(job._id || ''), ...data,
    },
  });
}

function observeJob(app: Application, job: Record<string, any>, kind: 'job_completed' | 'job_failed' | 'job_cancelled', code: string, metadata: Record<string, unknown> = {}): void {
  recordAgentOperationEvent(app, {
    kind, apiClientId: String(job.apiClientId || ''), agentRunId: String(job.agentRunId || ''),
    operationId: 'agent.jobs.execute', code, metadata: { jobId: String(job._id || ''), ...metadata },
  });
}

async function claimJob(app: Application, jobId: string): Promise<Record<string, any> | null> {
  const now = new Date();
  return models(app).AgentJob.findOneAndUpdate(
    {
      _id: jobId,
      status: { $in: ['queued', 'running'] },
      $or: [{ leaseExpiresAt: null }, { leaseExpiresAt: { $lte: now } }, { leaseOwner: workerId }],
    },
    {
      $set: {
        status: 'running', leaseOwner: workerId, leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
        startDate: now, editDate: now,
      },
    },
    { new: true },
  ).lean();
}

export async function processAgentJob(app: Application, jobId: string): Promise<void> {
  const db = models(app);
  const cancelled = await db.AgentJob.findOneAndUpdate(
    {
      _id: jobId, status: 'cancel_requested',
      $or: [{ leaseExpiresAt: null }, { leaseExpiresAt: { $lte: new Date() } }, { leaseOwner: workerId }],
    },
    {
      $set: { status: 'cancelled', completedDate: new Date(), editDate: new Date() },
      $unset: { leaseOwner: 1, leaseExpiresAt: 1 },
    },
    { new: true },
  ).lean();
  if (cancelled) {
    jobEvent(cancelled, 'agent.job.cancelled', { nextIndex: Number(cancelled.nextIndex || 0) });
    observeJob(app, cancelled, 'job_cancelled', 'AGENT_JOB_CANCELLED', { nextIndex: Number(cancelled.nextIndex || 0) });
    return;
  }
  const job = await claimJob(app, jobId);
  if (!job) return;
  const context = await jobContext(app, job);
  if (!context) {
    await db.AgentJob.updateOne({ _id: jobId, leaseOwner: workerId }, {
      $set: { status: 'failed', error: 'Credential or accountable user is no longer active', completedDate: new Date(), editDate: new Date() },
      $unset: { leaseOwner: 1, leaseExpiresAt: 1 },
    });
    jobEvent(job, 'agent.job.failed', { error: 'credential_or_owner_inactive' });
    observeJob(app, job, 'job_failed', 'AGENT_JOB_OWNER_INACTIVE');
    return;
  }

  if (Number.isInteger(job.activeIndex) && Number(job.activeIndex) >= 0) {
    const interruptedIndex = Number(job.activeIndex);
    const interrupted = job.commands[interruptedIndex] || {};
    await db.AgentJob.updateOne({ _id: jobId, leaseOwner: workerId }, {
      $push: { results: {
        commandId: String(interrupted.commandId || `command-${interruptedIndex + 1}`),
        operation: String(interrupted.operation || ''), status: 'failed', statusCode: 500,
        response: { success: false, error: { code: 'INTERRUPTED_WRITE_REQUIRES_REVIEW', message: 'Execution was interrupted; the command was not replayed automatically.' } },
        completedDate: new Date().toISOString(),
      } },
      $set: { activeIndex: null, nextIndex: interruptedIndex + 1, editDate: new Date() },
      $inc: { failedCount: 1 },
    });
    job.nextIndex = interruptedIndex + 1;
    job.activeIndex = null;
    job.failedCount = Number(job.failedCount || 0) + 1;
  }

  jobEvent(job, 'agent.job.started', { total: job.commands.length, nextIndex: Number(job.nextIndex || 0) });
  for (let index = Number(job.nextIndex || 0); index < job.commands.length; index += 1) {
    const current = await db.AgentJob.findById(jobId).select('status leaseOwner').lean();
    if (!current || current.leaseOwner !== workerId) return;
    if (current.status === 'cancel_requested') {
      await db.AgentJob.updateOne({ _id: jobId, leaseOwner: workerId }, {
        $set: { status: 'cancelled', completedDate: new Date(), editDate: new Date() },
        $unset: { leaseOwner: 1, leaseExpiresAt: 1 },
      });
      jobEvent(job, 'agent.job.cancelled', { nextIndex: index });
      observeJob(app, job, 'job_cancelled', 'AGENT_JOB_CANCELLED', { nextIndex: index });
      return;
    }
    await db.AgentJob.updateOne({ _id: jobId, leaseOwner: workerId }, {
      $set: { activeIndex: index, leaseExpiresAt: new Date(Date.now() + LEASE_MS), editDate: new Date() },
    });
    const result = await executeAgentCommand(job.commands[index], index, context);
    await db.AgentJob.updateOne({ _id: jobId, leaseOwner: workerId, activeIndex: index }, {
      $push: { results: result },
      $set: { activeIndex: null, nextIndex: index + 1, editDate: new Date(), leaseExpiresAt: new Date(Date.now() + LEASE_MS) },
      $inc: result.status === 'succeeded' ? { succeededCount: 1 } : { failedCount: 1 },
    });
    if (result.status === 'succeeded') job.succeededCount = Number(job.succeededCount || 0) + 1;
    else job.failedCount = Number(job.failedCount || 0) + 1;
    jobEvent(job, 'agent.job.progress', {
      commandId: result.commandId, index, completed: index + 1, total: job.commands.length, status: result.status,
    });
  }
  const status = Number(job.failedCount || 0) > 0 ? 'completed_with_errors' : 'completed';
  await db.AgentJob.updateOne({ _id: jobId, leaseOwner: workerId }, {
    $set: { status, completedDate: new Date(), editDate: new Date(), nextIndex: job.commands.length, activeIndex: null },
    $unset: { leaseOwner: 1, leaseExpiresAt: 1 },
  });
  jobEvent(job, 'agent.job.completed', {
    status, total: job.commands.length,
    succeededCount: Number(job.succeededCount || 0), failedCount: Number(job.failedCount || 0),
  });
  observeJob(app, job, 'job_completed', status === 'completed' ? 'AGENT_JOB_COMPLETED' : 'AGENT_JOB_COMPLETED_WITH_ERRORS', {
    status, succeededCount: Number(job.succeededCount || 0), failedCount: Number(job.failedCount || 0),
  });
}

export function scheduleAgentJob(app: Application, jobId: string): void {
  if (scheduledJobs.has(jobId)) return;
  scheduledJobs.add(jobId);
  setImmediate(() => {
    void processAgentJob(app, jobId)
      .catch(async (error: unknown) => {
        console.error('Agent job failed:', error);
        await models(app).AgentJob.updateOne({ _id: jobId }, {
          $set: { status: 'failed', error: error instanceof Error ? error.message : 'Agent job failed', completedDate: new Date(), editDate: new Date() },
          $unset: { leaseOwner: 1, leaseExpiresAt: 1 },
        });
        recordAgentOperationEvent(app, {
          kind: 'job_failed', operationId: 'agent.jobs.execute', code: 'AGENT_JOB_FAILED',
          metadata: { jobId },
        });
      })
      .finally(() => scheduledJobs.delete(jobId));
  });
}

export async function resumeAgentJobs(app: Application): Promise<number> {
  const jobs = await models(app).AgentJob.find({
    status: { $in: ['queued', 'running', 'cancel_requested'] },
    $or: [{ leaseExpiresAt: null }, { leaseExpiresAt: { $lte: new Date() } }],
  }).sort({ createDate: 1 }).limit(20).select('_id').lean();
  jobs.forEach((job: Record<string, unknown>) => scheduleAgentJob(app, String(job._id || '')));
  return jobs.length;
}

export function resetAgentJobSchedulerForTests(): void {
  scheduledJobs.clear();
}
