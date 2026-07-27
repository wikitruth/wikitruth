import appModForDb from '../app';
import constants from '../models/constants';

const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;
const ACCEPTED = constants.SCREENING_STATUS.status1.code;
const CRITICAL_ISSUE_TYPES = [10, 20, 30, 40, 45];
const EVIDENCE_RELATIONSHIPS = ['evidence', 'source', 'supports', 'refutes', 'qualifies', 'background'];
const VERDICT_MODELS = [
  { modelName: 'Topic', objectName: 'topic', objectType: constants.OBJECT_TYPES.topic },
  { modelName: 'Argument', objectName: 'argument', objectType: constants.OBJECT_TYPES.argument },
  { modelName: 'Answer', objectName: 'answer', objectType: constants.OBJECT_TYPES.answer },
];

export type KnowledgeHealthQueueKey = 'evidence_gaps' | 'critical_issues' | 'quorum_gaps'
  | 'revalidation' | 'source_failures' | 'stale_sources' | 'duplicates' | 'unanswered_questions';

export interface KnowledgeHealthQueue {
  key: KnowledgeHealthQueueKey;
  label: string;
  count: number;
  items: Array<Record<string, unknown>>;
}

function id(value: unknown): string {
  return String(value || '').trim();
}

function entryPath(objectName: string, entry: Record<string, unknown>): string {
  const objectId = encodeURIComponent(id(entry._id || entry.objectId));
  if (objectName === 'answer') return `/answers/entry/${objectId}`;
  const friendly = encodeURIComponent(String(entry.friendlyUrl || entry._id || entry.objectId || ''));
  return `/${objectName}s/entry/${friendly}/${objectId}`;
}

async function evidenceGaps(limit: number): Promise<KnowledgeHealthQueue> {
  const rows: Array<Record<string, unknown>> = [];
  let count = 0;
  for (const target of VERDICT_MODELS) {
    const linkedIds = db.ObjectLink?.distinct ? await db.ObjectLink.distinct('leftId', {
      leftType: target.objectType, relationship: { $in: EVIDENCE_RELATIONSHIPS }, private: { $ne: true },
    }) : [];
    const query = {
      private: { $ne: true }, 'screening.status': ACCEPTED,
      _id: { $nin: linkedIds },
      $or: [
        { 'verdicts.factual.status': { $in: ['supported', 'refuted', 'mixed'] }, 'verdicts.factual.evidenceRefs.0': { $exists: false } },
        { 'verdicts.ethical.status': { $in: ['permissible', 'impermissible', 'contested'] }, 'verdicts.ethical.evidenceRefs.0': { $exists: false } },
      ],
    };
    count += await db[target.modelName].countDocuments(query);
    if (rows.length < limit) {
      const entries = await db[target.modelName].find(query).sort({ editDate: -1 }).limit(limit - rows.length)
        .select('_id title friendlyUrl editDate verdicts').lean();
      rows.push(...entries.map((entry: Record<string, unknown>) => ({
        id: id(entry._id), title: String(entry.title || 'Untitled entry'), objectName: target.objectName,
        reason: 'Published verdict has no claim-level evidence', editDate: entry.editDate || null,
        path: entryPath(target.objectName, entry),
      })));
    }
  }
  return { key: 'evidence_gaps', label: 'Evidence gaps', count, items: rows };
}

async function criticalIssues(limit: number): Promise<KnowledgeHealthQueue> {
  const query = {
    issueType: { $in: CRITICAL_ISSUE_TYPES }, 'screening.status': ACCEPTED,
    'resolution.status': { $nin: ['resolved', 'dismissed'] }, private: { $ne: true },
  };
  const [count, entries] = await Promise.all([
    db.Issue.countDocuments(query),
    db.Issue.find(query).sort({ editDate: -1 }).limit(limit).select('_id title friendlyUrl issueType editDate').lean(),
  ]);
  return {
    key: 'critical_issues', label: 'Unresolved critical issues', count,
    items: entries.map((entry: Record<string, unknown>) => ({
      id: id(entry._id), title: String(entry.title || 'Critical issue'), objectName: 'issue',
      reason: `Accepted critical issue type ${Number(entry.issueType || 0)}`,
      editDate: entry.editDate || null, path: entryPath('issue', entry),
    })),
  };
}

async function reviewTasks(
  key: 'quorum_gaps' | 'revalidation',
  taskType: 'quorum_gap' | 'revalidation',
  limit: number,
): Promise<KnowledgeHealthQueue> {
  const query = { taskType, status: 'open', dueAt: { $lte: new Date() } };
  const [count, tasks] = await Promise.all([
    db.KnowledgeReviewTask.countDocuments(query),
    db.KnowledgeReviewTask.find(query).sort({ priority: -1, dueAt: 1 }).limit(limit).lean(),
  ]);
  return {
    key, label: key === 'quorum_gaps' ? 'Consensus quorum gaps' : 'Verdicts due for revalidation', count,
    items: tasks.map((task: Record<string, unknown>) => ({
      id: id(task._id), taskId: id(task._id), title: String(task.reason || 'Review task'),
      objectName: String(task.objectName || 'entry'), reason: String(task.reason || ''),
      dueAt: task.dueAt || null, priority: task.priority || 'normal',
      path: String(task.objectName || '') && task.objectId
        ? entryPath(String(task.objectName), { _id: task.objectId }) : '/admin/knowledge-health',
    })),
  };
}

async function sourceQueue(key: 'source_failures' | 'stale_sources', limit: number): Promise<KnowledgeHealthQueue> {
  const query = key === 'source_failures' ? {
    private: { $ne: true }, 'screening.status': ACCEPTED,
    'provenance.sourceIntegrity.status': { $in: ['changed', 'broken', 'blocked'] },
  } : {
    private: { $ne: true }, 'screening.status': ACCEPTED,
    'provenance.sourceIntegrity.nextCheckAt': { $lte: new Date() },
    'provenance.sourceIntegrity.status': { $in: ['healthy', 'unchecked'] },
  };
  const [count, entries] = await Promise.all([
    db.Artifact.countDocuments(query),
    db.Artifact.find(query).sort({ 'provenance.sourceIntegrity.checkedAt': 1 }).limit(limit)
      .select('_id title friendlyUrl editDate provenance.sourceIntegrity').lean(),
  ]);
  return {
    key, label: key === 'source_failures' ? 'Broken or changed sources' : 'Sources due for recheck', count,
    items: entries.map((entry: Record<string, unknown>) => {
      const integrity = (entry.provenance as Record<string, any> | undefined)?.sourceIntegrity || {};
      return {
        id: id(entry._id), title: String(entry.title || 'Artifact'), objectName: 'artifact',
        reason: key === 'source_failures' ? `Source status: ${integrity.status || 'unknown'}` : 'Scheduled source recheck is due',
        dueAt: integrity.nextCheckAt || null, path: entryPath('artifact', entry),
      };
    }),
  };
}

async function duplicates(limit: number): Promise<KnowledgeHealthQueue> {
  const query = { signalType: 'duplicate', status: { $in: ['open', 'in_review'] } };
  const [count, signals] = await Promise.all([
    db.ReaderSignal.countDocuments(query),
    db.ReaderSignal.find(query).sort({ createDate: -1 }).limit(limit).lean(),
  ]);
  return {
    key: 'duplicates', label: 'Reported duplicates', count,
    items: signals.map((signal: Record<string, unknown>) => ({
      id: id(signal._id), title: String(signal.note || `Reported duplicate ${signal.objectName || 'entry'}`),
      objectName: String(signal.objectName || 'entry'), reason: 'Reader reported a possible duplicate',
      editDate: signal.editDate || signal.createDate || null,
      path: signal.objectId ? entryPath(String(signal.objectName || 'entry'), { _id: signal.objectId }) : '/admin/moderation/signals',
    })),
  };
}

async function unansweredQuestions(limit: number): Promise<KnowledgeHealthQueue> {
  const query = {
    private: { $ne: true }, 'screening.status': ACCEPTED,
    $or: [{ 'childrenCount.answers.accepted': 0 }, { 'childrenCount.answers.accepted': { $exists: false } }],
  };
  const [count, entries] = await Promise.all([
    db.Question.countDocuments(query),
    db.Question.find(query).sort({ editDate: -1 }).limit(limit).select('_id title friendlyUrl editDate').lean(),
  ]);
  return {
    key: 'unanswered_questions', label: 'Unanswered questions', count,
    items: entries.map((entry: Record<string, unknown>) => ({
      id: id(entry._id), title: String(entry.title || 'Question'), objectName: 'question',
      reason: 'Accepted question has no accepted answer', editDate: entry.editDate || null,
      path: entryPath('question', entry),
    })),
  };
}

export async function buildKnowledgeHealth(limit = 25): Promise<{
  generatedAt: string;
  total: number;
  queues: KnowledgeHealthQueue[];
}> {
  const boundedLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  const queues = await Promise.all([
    evidenceGaps(boundedLimit), criticalIssues(boundedLimit),
    reviewTasks('quorum_gaps', 'quorum_gap', boundedLimit),
    reviewTasks('revalidation', 'revalidation', boundedLimit),
    sourceQueue('source_failures', boundedLimit), sourceQueue('stale_sources', boundedLimit),
    duplicates(boundedLimit), unansweredQuestions(boundedLimit),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    total: queues.reduce((sum, queue) => sum + queue.count, 0),
    queues,
  };
}

