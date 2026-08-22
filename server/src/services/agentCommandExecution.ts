'use strict';

import type { Application, NextFunction } from 'express';
import type { AuthUser } from '../types/auth';
import type { WikitruthRequest, WikitruthResponse } from '../types/http';
import type { ApiClientIdentity } from './apiClientService';
import { resolveAgentOperationPolicy } from './agentOperationPolicy';
import { enforceApiClientPolicy } from '../middlewares/apiClientPolicy';
import { requireContributorOnboarding } from '../middlewares/onboarding';
import { routeAgentAcceptedEditProposal } from '../middlewares/agentAcceptedEditProposal';
import attachTopics = require('../controllers/api/topics');
import { createArgument, updateArgument } from '../controllers/api/argumentWrites';
import attachQuestions = require('../controllers/api/questions');
import attachAnswers = require('../controllers/api/answers');
import attachArtifacts = require('../controllers/api/artifacts');
import attachIssues = require('../controllers/api/issues');
import attachOpinions = require('../controllers/api/opinions');
import {
  validateAgentCommand,
  type AgentCommand,
  type AgentCommandValidation,
} from './agentCommandValidation';

type Writer = (req: WikitruthRequest, res: WikitruthResponse) => Promise<unknown>;

const WRITERS: Record<string, { create: Writer; update: Writer }> = {
  topic: { create: attachTopics.createEntry, update: attachTopics.updateEntry },
  argument: { create: createArgument, update: updateArgument },
  question: { create: attachQuestions.createEntry, update: attachQuestions.updateEntry },
  answer: { create: attachAnswers.createEntry, update: attachAnswers.updateEntry },
  artifact: { create: attachArtifacts.createEntry, update: attachArtifacts.updateEntry },
  issue: { create: attachIssues.createEntry, update: attachIssues.updateEntry },
  opinion: { create: attachOpinions.createEntry, update: attachOpinions.updateEntry },
};

export interface AgentExecutionContext {
  app: Application;
  apiClient: ApiClientIdentity;
  user: AuthUser;
  agentRun: {
    runId: string;
    model: string;
    provider: string;
    purpose: string;
    sourceManifest: Array<Record<string, string>>;
  };
}

export interface AgentCommandResult {
  commandId: string;
  operation: string;
  status: 'succeeded' | 'failed';
  statusCode: number;
  response: unknown;
  completedDate: string;
}

class CapturedResponse {
  statusCode = 200;
  body: unknown = null;
  headers: Record<string, string> = {};
  locals: Record<string, unknown> = {};

  status(code: number): this { this.statusCode = code; return this; }
  json(body: unknown): this { this.body = body; return this; }
  send(body: unknown): this { this.body = body; return this; }
  setHeader(name: string, value: string): void { this.headers[name.toLowerCase()] = String(value); }
  getHeader(name: string): string | undefined { return this.headers[name.toLowerCase()]; }
}

function requestFor(command: AgentCommand, context: AgentExecutionContext): WikitruthRequest {
  const collection = `${command.entryType}s`;
  const editing = command.operation === 'entry.propose_edit';
  const path = editing ? `/${collection}/entry/${command.entryId}` : `/${collection}`;
  const headers: Record<string, string> = editing && command.baseRevisionId
    ? { 'if-match': command.baseRevisionId } : {};
  return {
    app: context.app,
    method: editing ? 'PUT' : 'POST',
    path,
    originalUrl: `/api/v1${path}`,
    params: editing ? { id: command.entryId || '' } : {},
    query: {},
    body: { ...command.payload, ...(command.baseRevisionId ? { baseRevisionId: command.baseRevisionId } : {}) },
    user: context.user,
    apiClient: context.apiClient,
    agentRun: context.agentRun,
    session: {} as WikitruthRequest['session'],
    get: ((name: string) => headers[name.toLowerCase()]) as WikitruthRequest['get'],
  } as WikitruthRequest;
}

async function passMiddleware(
  middleware: (req: WikitruthRequest, res: WikitruthResponse, next: NextFunction) => void | Promise<void>,
  req: WikitruthRequest,
  res: CapturedResponse,
): Promise<boolean> {
  let passed = false;
  await middleware(req, res as unknown as WikitruthResponse, () => { passed = true; });
  return passed;
}

export async function validateAgentCommandForContext(
  value: unknown,
  index: number,
  context: AgentExecutionContext,
): Promise<AgentCommandValidation & { statusCode?: number; policyError?: unknown }> {
  const validation = await validateAgentCommand(value, index);
  if (!validation.valid || !validation.command) return validation;
  const req = requestFor(validation.command, context);
  const operation = resolveAgentOperationPolicy(req.method, req.path);
  if (!operation?.agentAllowed || !operation.requiredScope
    || !context.apiClient.scopes.includes(operation.requiredScope)) {
    return {
      ...validation, valid: false, statusCode: 403,
      errors: [...validation.errors, { field: 'operation', message: 'The credential does not authorize this command.' }],
    };
  }
  const res = new CapturedResponse();
  if (!await passMiddleware(enforceApiClientPolicy, req, res)) {
    return {
      ...validation, valid: false, statusCode: res.statusCode, policyError: res.body,
      errors: [...validation.errors, { field: 'policy', message: 'The command violates the credential policy.' }],
    };
  }
  if (!await passMiddleware(requireContributorOnboarding, req, res)) {
    return {
      ...validation, valid: false, statusCode: res.statusCode, policyError: res.body,
      errors: [...validation.errors, { field: 'onboarding', message: 'The accountable user must complete contributor onboarding.' }],
    };
  }
  return validation;
}

export async function executeAgentCommand(
  value: unknown,
  index: number,
  context: AgentExecutionContext,
): Promise<AgentCommandResult> {
  const validation = await validateAgentCommandForContext(value, index, context);
  const commandId = validation.command?.commandId || `command-${index + 1}`;
  const operation = validation.command?.operation || 'invalid';
  if (!validation.valid || !validation.command) {
    return {
      commandId, operation, status: 'failed', statusCode: validation.statusCode || 400,
      response: { success: false, errors: validation.errors, warnings: validation.warnings, policyError: validation.policyError },
      completedDate: new Date().toISOString(),
    };
  }
  const command = validation.command;
  const writer = WRITERS[command.entryType];
  if (!writer) {
    return {
      commandId, operation, status: 'failed', statusCode: 400,
      response: { success: false, message: 'Unsupported entry type.' }, completedDate: new Date().toISOString(),
    };
  }
  const req = requestFor(command, context);
  const res = new CapturedResponse();
  try {
    if (command.operation === 'entry.create') {
      await writer.create(req, res as unknown as WikitruthResponse);
    } else {
      const passed = await passMiddleware(routeAgentAcceptedEditProposal, req, res);
      if (passed) await writer.update(req, res as unknown as WikitruthResponse);
    }
  } catch (error) {
    res.statusCode = 500;
    res.body = { success: false, message: error instanceof Error ? error.message : 'Command execution failed' };
  }
  return {
    commandId,
    operation,
    status: res.statusCode >= 200 && res.statusCode < 300 ? 'succeeded' : 'failed',
    statusCode: res.statusCode,
    response: JSON.parse(JSON.stringify(res.body ?? null)),
    completedDate: new Date().toISOString(),
  };
}
