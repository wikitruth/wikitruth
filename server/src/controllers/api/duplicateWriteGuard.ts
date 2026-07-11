'use strict';

import type { WikitruthResponse } from '../../types/http';
import { findDuplicateCandidatesForDraft } from '../../services/entryMergeService';

export async function rejectBlockingDuplicate(
  res: WikitruthResponse,
  objectType: number,
  draft: Record<string, unknown>
): Promise<boolean> {
  const candidates = await findDuplicateCandidatesForDraft(objectType, draft);
  const blocking = candidates.filter((candidate) => candidate.rule === 'exact_title' || candidate.rule === 'exact_content');
  if (!blocking.length) {
    return false;
  }
  res.status(409).json({
    success: false,
    error: 'A matching entry already exists in this scope.',
    code: 'DUPLICATE_ENTRY',
    candidates: blocking,
  });
  return true;
}

