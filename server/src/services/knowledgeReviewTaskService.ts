import appModForDb from '../app';

const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;

export async function queueKnowledgeReviewTask(input: {
  taskType: 'revalidation' | 'source_check' | 'evidence_gap' | 'quorum_gap';
  objectType: number;
  objectName: string;
  objectId: string;
  channel?: 'factual' | 'ethical' | '';
  dueAt: Date;
  priority?: 'normal' | 'elevated' | 'critical';
  reason: string;
  metadata?: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const now = new Date();
  return db.KnowledgeReviewTask.findOneAndUpdate(
    {
      taskType: input.taskType,
      objectType: input.objectType,
      objectId: input.objectId,
      channel: input.channel || '',
    },
    {
      $set: {
        objectName: input.objectName,
        dueAt: input.dueAt,
        priority: input.priority || 'normal',
        reason: input.reason,
        metadata: input.metadata || {},
        status: 'open',
        editDate: now,
        completedDate: null,
        completedUserId: null,
      },
      $setOnInsert: { createDate: now },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
}

export async function completeKnowledgeReviewTask(input: {
  id: string;
  status: 'completed' | 'dismissed';
  userId: string;
}): Promise<Record<string, unknown> | null> {
  return db.KnowledgeReviewTask.findByIdAndUpdate(input.id, {
    $set: {
      status: input.status,
      editDate: new Date(),
      completedDate: new Date(),
      completedUserId: input.userId,
    },
  }, { new: true }).lean();
}

