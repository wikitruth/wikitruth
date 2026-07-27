'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import { buildPublicTruthSummary } from '../../services/truthSummaryService';
import appModForDb from '../../app';
import { completeKnowledgeReviewTask } from '../../services/knowledgeReviewTaskService';
import { logEntryEvent } from '../../services/entryEventsService';
import { buildKnowledgeHealth } from '../../services/knowledgeHealthService';

const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;

function canReview(req: WikitruthRequest): boolean {
  return Boolean(req.user?.canPlayRoleOf?.('reviewer') || req.user?.canPlayRoleOf?.('admin'));
}

export = function (router: Router) {
  router.get('/:objectName/:id/truth-summary', async function (req: WikitruthRequest, res: WikitruthResponse) {
    const includePending = Boolean(req.user?.canPlayRoleOf?.('reviewer') || req.user?.roles?.admin);
    const summary = await buildPublicTruthSummary({
      objectName: String(req.params.objectName || ''),
      objectId: String(req.params.id || ''),
      includePending,
    });
    if (!summary) {
      res.status(404).json({ success: false, message: 'Truth summary not found' });
      return;
    }
    res.json({ success: true, summary });
  });

  router.get('/review-tasks', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!canReview(req)) {
      res.status(403).json({ success: false, message: 'Reviewer access required' });
      return;
    }
    const query: Record<string, unknown> = { status: String(req.query.status || 'open') };
    const taskType = String(req.query.taskType || '').trim();
    if (taskType) query.taskType = taskType;
    if (String(req.query.due || '') === 'true') query.dueAt = { $lte: new Date() };
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const tasks = await db.KnowledgeReviewTask.find(query).sort({ priority: -1, dueAt: 1 }).limit(limit).lean();
    res.json({ success: true, tasks, count: tasks.length });
  });

  router.get('/health', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!canReview(req)) {
      res.status(403).json({ success: false, message: 'Reviewer access required' });
      return;
    }
    const health = await buildKnowledgeHealth(Number(req.query.limit) || 25);
    const selected = String(req.query.queue || '').trim();
    res.json({
      success: true,
      health: selected ? { ...health, queues: health.queues.filter((queue) => queue.key === selected) } : health,
    });
  });

  router.patch('/review-tasks/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!canReview(req)) {
      res.status(403).json({ success: false, message: 'Reviewer access required' });
      return;
    }
    const status = String(req.body?.status || 'completed');
    if (status !== 'completed' && status !== 'dismissed') {
      res.status(400).json({ success: false, message: 'Status must be completed or dismissed' });
      return;
    }
    const task = await completeKnowledgeReviewTask({
      id: String(req.params.id || ''), status, userId: String(req.user?._id || req.user?.id || ''),
    });
    if (!task) {
      res.status(404).json({ success: false, message: 'Review task not found' });
      return;
    }
    await logEntryEvent({
      scope: 'privileged', eventType: 'knowledge.review-task.completed',
      objectType: Number(task.objectType || 0), objectName: String(task.objectName || ''), objectId: String(task.objectId || ''),
      actorUserId: String(req.user?._id || req.user?.id || ''), actorUsername: String(req.user?.username || ''),
      message: `Knowledge review task ${status}`, payload: { taskId: String(task._id || ''), taskType: task.taskType, status },
    });
    res.json({ success: true, task });
  });
};
