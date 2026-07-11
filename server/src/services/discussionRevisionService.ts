'use strict';

import appModForDb from '../app';

type ModelRegistry = {
  Opinion?: {
    updateMany: (query: Record<string, unknown>, update: Record<string, unknown>) => Promise<{ modifiedCount?: number }>;
  };
};

const db = (appModForDb as unknown as { db: { models: ModelRegistry } }).db.models;

export async function markCommentsPotentiallyObsolete(options: {
  objectType: number;
  objectId: string;
  revisionId: string;
  revisionNumber: number;
  reason: string;
}): Promise<number> {
  if (!db.Opinion || options.revisionNumber <= 1) {
    return 0;
  }
  const result = await db.Opinion.updateMany(
    {
      ownerType: options.objectType,
      ownerId: options.objectId,
      'discussionContext.status': { $ne: 'obsolete' },
      $or: [
        { 'discussionContext.revisionNumber': { $lt: options.revisionNumber } },
        { 'discussionContext.revisionNumber': { $exists: false } },
      ],
    },
    {
      $set: {
        'discussionContext.status': 'potentially_obsolete',
        'discussionContext.supersededByRevisionId': options.revisionId,
        'discussionContext.supersededByRevisionNumber': options.revisionNumber,
        'discussionContext.flaggedDate': new Date(),
        'discussionContext.reason': options.reason,
      },
    },
  );
  return Number(result.modifiedCount || 0);
}
