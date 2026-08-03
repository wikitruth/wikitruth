'use strict';

type ChildrenCountBucket = {
  total?: unknown;
  accepted?: unknown;
  pending?: unknown;
  rejected?: unknown;
  archived?: unknown;
};

type ChildrenCountNode = Record<string, ChildrenCountBucket | undefined>;

type ChildrenCountUpdateTask = {
  entryId?: unknown;
  entryType?: unknown;
  specificEntryType?: unknown;
};

type NormalizedChildrenCountUpdateTask = {
  entryId: unknown;
  entryType: number;
  specificEntryType: number | null;
};

type InvariantContext = {
  entryId?: unknown;
  entryType?: unknown;
};

function toFiniteCount(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

function assertBucketInvariants(bucketName: string, bucket: ChildrenCountBucket | undefined, context?: InvariantContext): void {
  if (!bucket || typeof bucket !== 'object') {
    return;
  }

  const accepted = toFiniteCount(bucket.accepted);
  const pending = toFiniteCount(bucket.pending);
  const rejected = toFiniteCount(bucket.rejected);
  const total = toFiniteCount(bucket.total);
  const expectedTotal = accepted + pending + rejected;

  if (total !== expectedTotal) {
    const entryType = context?.entryType ?? 'unknown-type';
    const entryId = context?.entryId ?? 'unknown-id';
    throw new Error(
      `childrenCount invariant violation (${bucketName}) for ${entryType}:${entryId}; total=${total}, expected=${expectedTotal}`
    );
  }
}

function assertChildrenCountInvariants(childrenCount: unknown, context?: InvariantContext): void {
  if (!childrenCount || typeof childrenCount !== 'object') {
    return;
  }

  const typedNode = childrenCount as ChildrenCountNode;
  Object.keys(typedNode).forEach((bucketName) => {
    assertBucketInvariants(bucketName, typedNode[bucketName], context);
  });
}

function normalizeChildrenCountUpdateTasks(tasks: unknown): NormalizedChildrenCountUpdateTask[] {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return [];
  }

  const normalized: NormalizedChildrenCountUpdateTask[] = [];
  const seenKeys = new Set<string>();

  tasks.forEach((task) => {
    if (!task || typeof task !== 'object') {
      return;
    }

    const typedTask = task as ChildrenCountUpdateTask;
    const entryId = typedTask.entryId;
    const entryType = Number(typedTask.entryType);
    const rawSpecificEntryType = typedTask.specificEntryType;
    const specificEntryType =
      rawSpecificEntryType === null || typeof rawSpecificEntryType === 'undefined'
        ? null
        : Number(rawSpecificEntryType);

    if (!entryId || !Number.isFinite(entryType) || entryType <= 0) {
      return;
    }

    if (rawSpecificEntryType !== null && typeof rawSpecificEntryType !== 'undefined' && !Number.isFinite(specificEntryType)) {
      return;
    }

    const dedupeKey = `${entryType}:${String(entryId)}:${specificEntryType === null ? 'all' : specificEntryType}`;
    if (seenKeys.has(dedupeKey)) {
      return;
    }

    seenKeys.add(dedupeKey);
    normalized.push({
      entryId,
      entryType,
      specificEntryType,
    });
  });

  return normalized;
}

export {
  assertChildrenCountInvariants,
  normalizeChildrenCountUpdateTasks,
};
