'use strict';

import constants from '../models/constants';
import { ENTRY_TYPE_NAMES, type ApiClientEntryType } from './apiClientService';
import { findDuplicateCandidatesForDraft } from './entryMergeService';

export type AgentCommandOperation = 'entry.create' | 'entry.propose_edit';

export interface AgentCommand {
  commandId: string;
  operation: AgentCommandOperation;
  entryType: ApiClientEntryType;
  entryId?: string;
  baseRevisionId?: string;
  payload: Record<string, unknown>;
}

export interface AgentCommandIssue {
  field: string;
  message: string;
}

export interface AgentCommandValidation {
  valid: boolean;
  command: AgentCommand | null;
  errors: AgentCommandIssue[];
  warnings: AgentCommandIssue[];
  duplicates: Array<Record<string, unknown>>;
}

const OBJECT_TYPE_BY_ENTRY_TYPE: Record<ApiClientEntryType, number> = {
  topic: constants.OBJECT_TYPES.topic,
  argument: constants.OBJECT_TYPES.argument,
  question: constants.OBJECT_TYPES.question,
  answer: constants.OBJECT_TYPES.answer,
  artifact: constants.OBJECT_TYPES.artifact,
  issue: constants.OBJECT_TYPES.issue,
  opinion: constants.OBJECT_TYPES.opinion,
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function normalizeAgentCommand(value: unknown, index = 0): AgentCommand | null {
  const input = record(value);
  const operation = String(input.operation || '').trim().toLowerCase() as AgentCommandOperation;
  const entryType = String(input.entryType || '').trim().toLowerCase() as ApiClientEntryType;
  const commandId = String(input.commandId || `command-${index + 1}`).trim();
  if (!['entry.create', 'entry.propose_edit'].includes(operation)
    || !ENTRY_TYPE_NAMES.includes(entryType)
    || !/^[A-Za-z0-9._:-]{3,120}$/.test(commandId)) return null;
  return {
    commandId,
    operation,
    entryType,
    entryId: String(input.entryId || '').trim() || undefined,
    baseRevisionId: String(input.baseRevisionId || '').trim() || undefined,
    payload: record(input.payload),
  };
}

export async function validateAgentCommand(value: unknown, index = 0): Promise<AgentCommandValidation> {
  const command = normalizeAgentCommand(value, index);
  const errors: AgentCommandIssue[] = [];
  const warnings: AgentCommandIssue[] = [];
  let duplicates: Array<Record<string, unknown>> = [];
  if (!command) {
    return { valid: false, command: null, errors: [{ field: `commands.${index}`, message: 'Unsupported or malformed command.' }], warnings, duplicates };
  }
  const { payload, entryType } = command;
  if (command.operation === 'entry.create') {
    const title = String(payload.title || '').trim();
    const content = String(payload.content || payload.description || '').trim();
    if (!title && !['answer', 'opinion'].includes(entryType)) {
      errors.push({ field: 'payload.title', message: 'A title is required.' });
    }
    const minimumTitle = entryType === 'argument' ? 5 : 3;
    if (title && title.length < minimumTitle) {
      errors.push({ field: 'payload.title', message: `Title must be at least ${minimumTitle} characters.` });
    }
    const minimumContent = entryType === 'argument' ? 20 : 10;
    if (content.length < minimumContent) {
      errors.push({ field: 'payload.content', message: `Content must be at least ${minimumContent} characters.` });
    }
    if (!payload.ownerId && !payload.topicId && !payload.questionId && entryType !== 'topic') {
      warnings.push({ field: 'payload.ownerId', message: 'Confirm the intended parent or owner before execution.' });
    }
    if (!errors.length) {
      duplicates = await findDuplicateCandidatesForDraft(OBJECT_TYPE_BY_ENTRY_TYPE[entryType], payload) as unknown as Array<Record<string, unknown>>;
      if (duplicates.some((candidate) => ['exact_title', 'exact_content'].includes(String(candidate.rule || '')))) {
        errors.push({ field: 'payload', message: 'An exact duplicate exists in this contribution scope.' });
      }
    }
  } else {
    if (!command.entryId) errors.push({ field: 'entryId', message: 'entryId is required.' });
    if (!command.baseRevisionId) errors.push({ field: 'baseRevisionId', message: 'baseRevisionId is required.' });
    if (!Object.keys(payload).length) errors.push({ field: 'payload', message: 'At least one proposed field is required.' });
    warnings.push({ field: 'operation', message: 'Accepted entries become human-reviewed change requests.' });
  }
  return { valid: errors.length === 0, command, errors, warnings, duplicates };
}
