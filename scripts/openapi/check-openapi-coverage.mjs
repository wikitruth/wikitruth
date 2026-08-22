#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const specPath = path.join(root, 'docs/api/openapi.json');
const write = process.argv.includes('--write');
const agentPolicies = JSON.parse(fs.readFileSync(path.join(root, 'server/src/config/agentOperationPolicies.json'), 'utf8'));
const agentScopes = [
  'entries:read', 'entries:create', 'entries:propose-edit', 'graph:write',
  'civic:read', 'civic:contribute', 'moderation:advise', 'translations:write',
  'debates:participate', 'agent:runs:read',
];
const groups = [
  ['/home', ['home.ts']], ['/application-context', ['applicationContext.ts']],
  ['/topics', ['topics.ts']], ['/arguments', ['arguments.ts']], ['/questions', ['questions.ts']],
  ['/answers', ['answers.ts']], ['/artifacts', ['artifacts.ts']], ['/issues', ['issues.ts']],
  ['/opinions', ['opinions.ts']], ['/search', ['search.ts']], ['/groups', ['groups.ts']],
  ['/members', ['members.ts']], ['/auth', [
    'auth.ts',
    'authEmailCodeRoutes.ts',
    'authOnboardingRoutes.ts',
    'authPasskeyRoutes.ts',
    'authSessionRoutes.ts',
  ]], ['/contact', ['contact.ts']],
  ['/admin', ['admin.ts', 'adminCollectionRoutes.ts', 'adminBackupRoutes.ts', 'adminApiClientRoutes.ts', 'adminOperationalRoutes.ts', 'adminPrivacyRoutes.ts']],
  ['/moderation', ['moderation.ts', 'moderationArtifactRoutes.ts', 'moderationDuplicateRoutes.ts', 'moderationIssueRoutes.ts', 'moderationRevisionRoutes.ts', 'moderationSignalsRoutes.ts', 'moderationVerdictChannelRoutes.ts']],
  ['/outline', ['outline.ts']], ['/monitoring', ['monitoring.ts']], ['/realtime', ['realtime.ts']],
  ['/reactions', ['reactions.ts']], ['/notifications', ['notifications.ts']], ['/timeline', ['timeline.ts']],
  ['/install', ['install.ts']], ['/pages', ['pages.ts']], ['/anonymous-contributions', ['anonymousContributions.ts']],
  ['/agent', ['agent.ts']],
  ['/civic', ['civic.ts', 'civicAdministration.ts', 'civicEntryLinks.ts', 'civicResponses.ts']],
  ['/tenants/{tenantId}/civic', ['civic.ts', 'civicAdministration.ts', 'civicEntryLinks.ts', 'civicResponses.ts']],
  ['/epistemic', ['epistemic.ts']], ['/translations', ['translations.ts']],
  ['/privacy', ['privacy.ts']],
  ['/transparency', ['transparency.ts']],
  ['/structured-debates', ['structuredDebates.ts']],
];

function joinRoute(prefix, route) {
  const suffix = route === '/' ? '' : route;
  return `${prefix}${suffix}`.replace(/:([A-Za-z][A-Za-z0-9_]*)/g, '{$1}') || '/';
}

function mountedRoutes() {
  const routes = [];
  const controllerRoot = path.join(root, 'server/src/controllers/api');
  groups.forEach(([prefix, files]) => files.forEach((file) => {
    const source = fs.readFileSync(path.join(controllerRoot, file), 'utf8');
    const pattern = /router\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = pattern.exec(source))) {
      routes.push({ method: match[1], path: joinRoute(prefix, match[2]), source: file });
    }
    if (file === 'adminCollectionRoutes.ts') {
      const collectionPattern = /path:\s*['"]([^'"]+)['"]/g;
      while ((match = collectionPattern.exec(source))) {
        routes.push({ method: 'get', path: joinRoute(prefix, match[1]), source: file });
        routes.push({ method: 'get', path: joinRoute(prefix, `${match[1]}/:id`), source: file });
      }
    }
  }));
  return [...new Map(routes.map((route) => [`${route.method} ${route.path}`, route])).values()];
}

function operationId(method, route) {
  const words = route.replace(/[{}]/g, '').split(/[^A-Za-z0-9]+/).filter(Boolean);
  return `${method}${words.map((word) => word[0].toUpperCase() + word.slice(1)).join('')}`;
}

function genericOperation(route) {
  const mutation = route.method !== 'get';
  const parameters = [...route.path.matchAll(/{([^}]+)}/g)].map((match) => ({
    name: match[1], in: 'path', required: true, schema: { type: 'string' },
  }));
  return {
    operationId: operationId(route.method, route.path),
    summary: `${route.method.toUpperCase()} ${route.path}`,
    ...(parameters.length ? { parameters } : {}),
    ...(mutation ? { requestBody: { required: false, content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericMutationRequest' } } } } } : {}),
    responses: {
      [route.method === 'post' ? '201' : '200']: { $ref: '#/components/responses/StandardSuccess' },
      '400': { $ref: '#/components/responses/BadRequest' },
      '401': { $ref: '#/components/responses/Unauthorized' },
      '403': { $ref: '#/components/responses/Forbidden' },
      '404': { $ref: '#/components/responses/NotFound' },
      '406': { $ref: '#/components/responses/UnsupportedVersion' },
      '429': { $ref: '#/components/responses/RateLimited' },
    },
  };
}

function addComponents(spec) {
  const components = spec.components ||= {};
  const schemas = components.schemas ||= {};
  components.headers = {
    ...(components.headers || {}),
    ApiVersion: { description: 'Stable API major version', schema: { type: 'string', example: '1' } },
    ApiStability: { description: 'stable for /api/v1 or compatibility for /api', schema: { type: 'string', enum: ['stable', 'compatibility'] } },
    RateLimitRemaining: { description: 'Requests remaining in this window', schema: { type: 'integer' } },
  };
  schemas.ApiError = {
    type: 'object', required: ['code', 'message', 'requestId'],
    properties: { code: { type: 'string', example: 'FORBIDDEN' }, message: { type: 'string' }, details: { nullable: true }, requestId: { type: 'string', nullable: true } },
  };
  schemas.ApiErrorResponse = { type: 'object', required: ['success', 'error'], properties: { success: { type: 'boolean', enum: [false] }, error: { $ref: '#/components/schemas/ApiError' } } };
  schemas.ApiClientIdentity = {
    type: 'object', required: ['id', 'clientId', 'name', 'userId', 'scopes', 'policy'],
    properties: {
      id: { type: 'string' }, clientId: { type: 'string' }, name: { type: 'string' }, userId: { type: 'string' },
      tokenPrefix: { type: 'string' }, scopes: { type: 'array', items: { type: 'string', enum: agentScopes } },
      rateLimitPerMinute: { type: 'integer', minimum: 10, maximum: 600 },
      expiresAt: { type: 'string', format: 'date-time', nullable: true },
      policy: { $ref: '#/components/schemas/ApiClientPolicy' },
    },
    example: { id: '66f000000000000000000010', clientId: '4f86a29c50bc49a1b540a8d1', name: 'Research agent', scopes: ['entries:read', 'entries:create'], userId: '66f000000000000000000001' },
  };
  schemas.ApiClientPolicy = {
    type: 'object', required: ['tenantIds', 'entryTypes', 'parentRootIds', 'ownContentOnly', 'maxVisibility', 'sourceRequired', 'maxBatchSize'],
    properties: {
      tenantIds: { type: 'array', maxItems: 100, items: { type: 'string' } },
      entryTypes: { type: 'array', items: { type: 'string', enum: ['topic', 'argument', 'question', 'answer', 'artifact', 'issue', 'opinion'] } },
      parentRootIds: { type: 'array', maxItems: 100, items: { type: 'string' } },
      ownContentOnly: { type: 'boolean', default: true },
      maxVisibility: { type: 'string', enum: ['public_only', 'owned_private'], default: 'public_only' },
      sourceRequired: { type: 'boolean', default: false },
      maxBatchSize: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
    },
  };
  schemas.ApiClientCreateRequest = {
    type: 'object', required: ['name', 'userId', 'scopes'],
    properties: { name: { type: 'string', minLength: 3, maxLength: 120 }, description: { type: 'string', maxLength: 500 }, userId: { type: 'string' }, scopes: { type: 'array', minItems: 1, items: { type: 'string', enum: agentScopes } }, policy: { $ref: '#/components/schemas/ApiClientPolicy' }, expiresAt: { type: 'string', format: 'date-time', nullable: true }, rateLimitPerMinute: { type: 'integer', minimum: 10, maximum: 600 } },
  };
  schemas.ApiClientCredentialResponse = { type: 'object', properties: { success: { type: 'boolean' }, token: { type: 'string', description: 'Shown once; store securely' }, client: { $ref: '#/components/schemas/ApiClientIdentity' } } };
  schemas.AgentCapabilities = { type: 'object', properties: { success: { type: 'boolean' }, apiVersion: { type: 'string' }, authentication: { type: 'string' }, scopes: { type: 'array', items: { type: 'string', enum: agentScopes } }, credentialPolicy: { $ref: '#/components/schemas/ApiClientPolicy' }, contributionContract: { type: 'object' }, endpoints: { type: 'object' } } };
  schemas.GraphLinkRequest = { type: 'object', required: ['parentId', 'targetId', 'relationship'], properties: { parentId: { type: 'string' }, targetId: { type: 'string' }, relationship: { type: 'string', enum: ['child', 'support', 'oppose', 'related', 'evidence', 'source', 'dependency'] } } };
  schemas.VerdictVoteRequest = { type: 'object', required: ['objectType', 'objectId', 'channel', 'status', 'reasoning', 'confidence', 'conflictDeclared'], properties: { objectType: { type: 'integer' }, objectId: { type: 'string' }, channel: { type: 'string', enum: ['factual', 'ethical'] }, status: { type: 'string' }, reasoning: { type: 'string', minLength: 20 }, evidenceReferences: { type: 'array', items: { type: 'string' } }, confidence: { type: 'integer', minimum: 0, maximum: 100 }, expertise: { type: 'string' }, conflictDeclared: { type: 'boolean' }, ethicalFramework: { type: 'string' } } };
  schemas.AdminFinalSayRequest = { type: 'object', required: ['objectType', 'objectId', 'channel', 'status', 'reasoning', 'overrideReason', 'acknowledgeOverride'], properties: { objectType: { type: 'integer' }, objectId: { type: 'string' }, channel: { type: 'string', enum: ['factual', 'ethical'] }, status: { type: 'string' }, reasoning: { type: 'string', minLength: 10 }, framework: { type: 'string' }, evidenceRefs: { type: 'array', items: { type: 'string' } }, overrideReason: { type: 'string', minLength: 10 }, acknowledgeOverride: { type: 'boolean', enum: [true] } } };
  schemas.CivicExtensionValue = { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] };
  schemas.CivicExtensionField = { type: 'object', required: ['key', 'label', 'type'], properties: { key: { type: 'string', pattern: '^[a-z][a-z0-9_]{0,39}$' }, label: { type: 'string' }, type: { type: 'string', enum: ['text', 'textarea', 'number', 'boolean', 'date', 'url', 'select'] }, required: { type: 'boolean' }, options: { type: 'array', items: { type: 'object', properties: { value: { type: 'string' }, label: { type: 'string' } } } } } };
  schemas.CivicExtensionSchema = { type: 'object', required: ['fields'], properties: { title: { type: 'string' }, description: { type: 'string' }, fields: { type: 'array', maxItems: 30, items: { $ref: '#/components/schemas/CivicExtensionField' } } } };
  schemas.CivicTenantReadinessCheck = { type: 'object', required: ['key', 'label', 'status', 'message'], properties: { key: { type: 'string' }, label: { type: 'string' }, status: { type: 'string', enum: ['pass', 'warning', 'fail'] }, message: { type: 'string' } } };
  schemas.CivicTenantReadiness = { type: 'object', required: ['tenantId', 'scope', 'ready', 'generatedAt', 'checks', 'summary'], properties: { tenantId: { type: 'string' }, scope: { type: 'string', enum: ['configuration', 'launch'] }, ready: { type: 'boolean' }, generatedAt: { type: 'string', format: 'date-time' }, checks: { type: 'array', items: { $ref: '#/components/schemas/CivicTenantReadinessCheck' } }, summary: { type: 'object', properties: { passed: { type: 'integer' }, warnings: { type: 'integer' }, failed: { type: 'integer' } } } } };
  schemas.CivicTenantPreview = { type: 'object', required: ['tenant', 'readiness', 'presentation'], properties: { tenant: { $ref: '#/components/schemas/CivicTenant' }, readiness: { $ref: '#/components/schemas/CivicTenantReadiness' }, presentation: { type: 'object', properties: { cssVariables: { type: 'object', additionalProperties: { type: 'string' } }, navigation: { type: 'array', items: { type: 'object' } }, home: { type: 'object' } } } } };
  schemas.CivicTenantPreviewResponse = { type: 'object', required: ['success', 'preview'], properties: { success: { type: 'boolean', enum: [true] }, preview: { $ref: '#/components/schemas/CivicTenantPreview' } } };
  schemas.CivicTenantReadinessResponse = { type: 'object', required: ['success', 'readiness'], properties: { success: { type: 'boolean', enum: [true] }, readiness: { $ref: '#/components/schemas/CivicTenantReadiness' } } };
  schemas.PortableCivicTenantConfiguration = { type: 'object', required: ['format', 'version', 'exportedAt', 'tenant', 'readiness'], properties: { format: { type: 'string', enum: ['wikitruth.civic-tenant'] }, version: { type: 'string', enum: ['1.0'] }, exportedAt: { type: 'string', format: 'date-time' }, tenant: { $ref: '#/components/schemas/CivicTenant' }, readiness: { $ref: '#/components/schemas/CivicTenantReadiness' } } };
  schemas.PublicTruthSummary = { type: 'object', required: ['entry', 'channels', 'evidenceMap', 'unresolvedIssues', 'generatedAt'], properties: { entry: { type: 'object' }, channels: { type: 'array', items: { type: 'object' } }, evidenceMap: { type: 'array', items: { type: 'object' } }, unresolvedIssues: { type: 'array', items: { type: 'object' } }, generatedAt: { type: 'string', format: 'date-time' } } };
  schemas.PublicTruthSummaryResponse = { type: 'object', required: ['success', 'summary'], properties: { success: { type: 'boolean', enum: [true] }, summary: { $ref: '#/components/schemas/PublicTruthSummary' } } };
  schemas.PublicTrustMetric = { type: 'object', required: ['key', 'label', 'display', 'description', 'suppressed'], properties: { key: { type: 'string' }, label: { type: 'string' }, display: { type: 'string' }, description: { type: 'string' }, percent: { type: 'integer', minimum: 0, maximum: 100 }, value: { type: 'integer', minimum: 0 }, numerator: { type: 'integer', minimum: 0 }, denominator: { type: 'integer', minimum: 0 }, suppressed: { type: 'boolean' }, suppressionReason: { type: 'string', enum: ['small_cohort', 'no_data'] } } };
  schemas.PublicTrustDashboard = { type: 'object', required: ['generatedAt', 'scope', 'summary', 'quality', 'lifecycle', 'governance', 'privacy', 'methodology'], properties: { generatedAt: { type: 'string', format: 'date-time' }, scope: { type: 'object' }, summary: { type: 'object' }, quality: { type: 'array', items: { $ref: '#/components/schemas/PublicTrustMetric' } }, lifecycle: { type: 'array', items: { type: 'object' } }, governance: { type: 'array', items: { $ref: '#/components/schemas/PublicTrustMetric' } }, privacy: { type: 'object' }, methodology: { type: 'array', items: { type: 'string' } } } };
  schemas.PublicTrustDashboardResponse = { type: 'object', required: ['success', 'dashboard'], properties: { success: { type: 'boolean', enum: [true] }, dashboard: { $ref: '#/components/schemas/PublicTrustDashboard' } } };
  schemas.PublicEvidenceBundle = { type: 'object', required: ['schemaVersion', 'generatedAt', 'canonicalUrl', 'entry', 'relationships', 'translations'], properties: { schemaVersion: { type: 'string', enum: ['1.0'] }, generatedAt: { type: 'string', format: 'date-time' }, canonicalUrl: { type: 'string', format: 'uri' }, entry: { type: 'object' }, revision: { type: 'object', nullable: true }, truthSummary: { allOf: [{ $ref: '#/components/schemas/PublicTruthSummary' }], nullable: true }, relationships: { type: 'array', items: { type: 'object' } }, translations: { type: 'array', items: { type: 'object' } } } };
  schemas.PublicEvidenceJsonLd = { type: 'object', required: ['@context', '@id', '@type', 'identifier'], properties: { '@context': { type: 'object' }, '@id': { type: 'string', format: 'uri' }, '@type': { type: 'string' }, identifier: { type: 'string' }, citation: { type: 'array', items: { type: 'object' } } }, additionalProperties: true };
  schemas.EntryTranslationRequest = { type: 'object', required: ['locale', 'title', 'content'], properties: { locale: { type: 'string' }, title: { type: 'string', minLength: 3 }, content: { type: 'string', minLength: 10 } } };
  schemas.NotificationPreferences = { type: 'object', properties: { inApp: { type: 'boolean' }, emailDigest: { type: 'string', enum: ['off', 'daily', 'weekly'] }, webPush: { type: 'boolean' } } };
  schemas.AgentCommand = {
    type: 'object', required: ['commandId', 'operation', 'entryType', 'payload'],
    properties: {
      commandId: { type: 'string', pattern: '^[A-Za-z0-9._:-]{3,120}$' },
      operation: { type: 'string', enum: ['entry.create', 'entry.propose_edit'] },
      entryType: { type: 'string', enum: ['topic', 'argument', 'question', 'answer', 'artifact', 'issue', 'opinion'] },
      entryId: { type: 'string' }, baseRevisionId: { type: 'string' }, payload: { type: 'object' },
    },
  };
  schemas.AgentValidationRequest = {
    oneOf: [
      { type: 'object', required: ['commands'], properties: { commands: { type: 'array', minItems: 1, maxItems: 100, items: { $ref: '#/components/schemas/AgentCommand' } } } },
      { type: 'object', required: ['operation', 'payload'], properties: { operation: { type: 'string', enum: ['contribution', 'entry_edit', 'graph_link', 'verdict_advice', 'civic_record', 'translation', 'debate_contribution'] }, entryType: { type: 'string' }, tenantId: { type: 'string' }, payload: { type: 'object' } } },
    ],
  };
  schemas.AgentJobRequest = { type: 'object', required: ['commands'], properties: { commands: { type: 'array', minItems: 1, maxItems: 100, items: { $ref: '#/components/schemas/AgentCommand' } } } };
  schemas.AgentCommandResult = { type: 'object', required: ['commandId', 'operation', 'status', 'statusCode', 'completedDate'], properties: { commandId: { type: 'string' }, operation: { type: 'string' }, status: { type: 'string', enum: ['succeeded', 'failed'] }, statusCode: { type: 'integer' }, response: {}, completedDate: { type: 'string', format: 'date-time' } } };
  schemas.AgentJob = { type: 'object', required: ['agentRunId', 'status'], properties: { _id: { type: 'string' }, id: { type: 'string' }, agentRunId: { type: 'string' }, status: { type: 'string', enum: ['queued', 'running', 'cancel_requested', 'cancelled', 'completed', 'completed_with_errors', 'failed'] }, nextIndex: { type: 'integer' }, succeededCount: { type: 'integer' }, failedCount: { type: 'integer' }, results: { type: 'array', items: { $ref: '#/components/schemas/AgentCommandResult' } }, createDate: { type: 'string', format: 'date-time' }, completedDate: { type: 'string', format: 'date-time', nullable: true } } };
  schemas.AgentJobResponse = { type: 'object', required: ['success', 'job'], properties: { success: { type: 'boolean' }, job: { $ref: '#/components/schemas/AgentJob' } } };
  schemas.AgentJobCollection = { type: 'object', required: ['success', 'items'], properties: { success: { type: 'boolean' }, items: { type: 'array', items: { $ref: '#/components/schemas/AgentJob' } }, nextCursor: { type: 'string', nullable: true } } };
  schemas.AdminCollectionResponse = {
    type: 'object', required: ['success', 'items', 'total', 'page', 'limit', 'pages', 'query'],
    properties: {
      success: { type: 'boolean', enum: [true] },
      items: { type: 'array', items: { type: 'object', additionalProperties: true } },
      total: { type: 'integer', minimum: 0 }, page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100 }, pages: { type: 'integer', minimum: 1 },
      query: { type: 'string', maxLength: 100 },
    },
  };
  schemas.AdminDetailResponse = { type: 'object', required: ['success', 'item'], properties: { success: { type: 'boolean', enum: [true] }, item: { type: 'object', additionalProperties: true } } };
  if (schemas.CivicRecord?.properties) schemas.CivicRecord.properties.extensions = { type: 'object', additionalProperties: { $ref: '#/components/schemas/CivicExtensionValue' } };
  if (schemas.CivicRecordMutationRequest?.properties) schemas.CivicRecordMutationRequest.properties.extensions = { type: 'object', additionalProperties: { $ref: '#/components/schemas/CivicExtensionValue' } };
  if (schemas.CivicTenant?.properties) schemas.CivicTenant.properties.extensionSchemas = { type: 'object', additionalProperties: { $ref: '#/components/schemas/CivicExtensionSchema' } };

  const errorResponse = (description) => ({ description, content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiErrorResponse' } } } });
  components.responses = {
    ...(components.responses || {}),
    StandardSuccess: { description: 'Success', headers: { 'API-Version': { $ref: '#/components/headers/ApiVersion' }, 'X-API-Stability': { $ref: '#/components/headers/ApiStability' } }, content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardApiResponse' } } } },
    BadRequest: errorResponse('Invalid request'), Unauthorized: errorResponse('Authentication required'), Forbidden: errorResponse('Insufficient scope or role'), NotFound: errorResponse('Resource not found'), UnsupportedVersion: errorResponse('Unsupported API version'), RateLimited: errorResponse('Rate limit exceeded'),
  };
  components.securitySchemes = {
    ...(components.securitySchemes || {}),
    AgentBearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'wt_agent_<clientId>.<secret>', description: 'Scoped API-client credential tied to an accountable user' },
  };
}

function specialize(spec) {
  const paths = spec.paths;
  const response = (schema) => ({ '200': { description: 'Success', content: { 'application/json': { schema: { $ref: `#/components/schemas/${schema}` } } } }, '401': { $ref: '#/components/responses/Unauthorized' }, '403': { $ref: '#/components/responses/Forbidden' }, '429': { $ref: '#/components/responses/RateLimited' } });
  if (paths['/agent/identity']?.get) Object.assign(paths['/agent/identity'].get, { summary: 'Inspect the authenticated agent identity', security: [{ AgentBearerAuth: [] }], responses: response('ApiClientIdentity') });
  if (paths['/agent/capabilities']?.get) Object.assign(paths['/agent/capabilities'].get, { summary: 'Discover routes allowed by the token scopes', security: [{ AgentBearerAuth: [] }], responses: response('AgentCapabilities') });
  if (paths['/admin/api-clients']?.post) Object.assign(paths['/admin/api-clients'].post, { summary: 'Create a scoped agent credential', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiClientCreateRequest' } } } }, responses: { '201': { description: 'Credential created; raw token is shown once', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiClientCredentialResponse' } } } }, '400': { $ref: '#/components/responses/BadRequest' }, '403': { $ref: '#/components/responses/Forbidden' } } });
  if (paths['/outline/link']?.post) Object.assign(paths['/outline/link'].post, { summary: 'Create a governed knowledge-graph relationship', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/GraphLinkRequest' } } } } });
  if (paths['/moderation/verdict-votes']?.post) Object.assign(paths['/moderation/verdict-votes'].post, { summary: 'Submit a human channel-specific consensus vote', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/VerdictVoteRequest' } } } } });
  if (paths['/moderation/verdict-channel']?.put) Object.assign(paths['/moderation/verdict-channel'].put, { summary: 'Publish an explicit administrator final-say decision', description: 'This exceptional route is unavailable to API clients and records an audited override of the current consensus snapshot.', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AdminFinalSayRequest' } } } } });
  if (paths['/search']?.get) paths['/search'].get.parameters = [
    { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
    { name: 'tab', in: 'query', schema: { type: 'string', enum: ['all', 'topics', 'arguments', 'questions', 'answers', 'artifacts', 'issues', 'opinions'] } },
    { name: 'content', in: 'query', schema: { type: 'string', enum: ['all', 'wiki', 'journal'] } },
    { name: 'relationship', in: 'query', schema: { type: 'string', enum: ['any', 'supports', 'refutes', 'qualifies', 'background', 'evidence', 'source'] } },
    { name: 'evidence', in: 'query', schema: { type: 'string', enum: ['all', 'linked', 'missing'] } },
  ];
  ['/epistemic/{objectName}/{id}/evidence-bundle', '/epistemic/{objectName}/{id}/evidence-bundle.jsonld'].forEach((route) => {
    if (!paths[route]?.get) return;
    Object.assign(paths[route].get, {
      summary: route.endsWith('.jsonld') ? 'Export a public evidence bundle as JSON-LD' : 'Export a public evidence bundle',
      responses: { '200': { description: 'Accepted public entry evidence and revision bundle', content: { [route.endsWith('.jsonld') ? 'application/ld+json' : 'application/json']: { schema: { $ref: route.endsWith('.jsonld') ? '#/components/schemas/PublicEvidenceJsonLd' : '#/components/schemas/PublicEvidenceBundle' } } } }, '404': { $ref: '#/components/responses/NotFound' } },
    });
  });
  if (paths['/epistemic/{objectName}/{id}/truth-summary']?.get) Object.assign(paths['/epistemic/{objectName}/{id}/truth-summary'].get, { summary: 'Explain a public verdict and its evidence', responses: response('PublicTruthSummaryResponse') });
  if (paths['/transparency/trust']?.get) Object.assign(paths['/transparency/trust'].get, { summary: 'Read privacy-safe public trust aggregates', responses: response('PublicTrustDashboardResponse') });
  if (paths['/translations/{objectName}/{id}']?.post) Object.assign(paths['/translations/{objectName}/{id}'].post, { summary: 'Submit a revision-linked entry translation', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/EntryTranslationRequest' } } } } });
  if (paths['/notifications/preferences']?.put) Object.assign(paths['/notifications/preferences'].put, { summary: 'Update notification delivery preferences', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/NotificationPreferences' } } } } });
  if (paths['/agent/validate']?.post) Object.assign(paths['/agent/validate'].post, { summary: 'Dry-run and validate an accountable agent mutation', security: [{ AgentBearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentValidationRequest' } } } } });
  if (paths['/agent/jobs']?.post) Object.assign(paths['/agent/jobs'].post, {
    summary: 'Queue a bounded durable agent command job',
    parameters: [
      { name: 'X-Agent-Run-Id', in: 'header', required: true, schema: { type: 'string', minLength: 4, maxLength: 120 } },
      { name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', minLength: 8, maxLength: 200 } },
    ],
    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentJobRequest' } } } },
    responses: { '202': { description: 'Job accepted', content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentJobResponse' } } } }, '400': { $ref: '#/components/responses/BadRequest' }, '401': { $ref: '#/components/responses/Unauthorized' }, '403': { $ref: '#/components/responses/Forbidden' }, '429': { $ref: '#/components/responses/RateLimited' } },
  });
  if (paths['/agent/jobs']?.get) Object.assign(paths['/agent/jobs'].get, {
    summary: 'List agent jobs using a stable opaque cursor',
    parameters: [{ name: 'cursor', in: 'query', schema: { type: 'string' } }, { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } }],
    responses: response('AgentJobCollection'),
  });
  if (paths['/agent/jobs/{id}']?.get) Object.assign(paths['/agent/jobs/{id}'].get, { summary: 'Poll one agent job and its per-command results', responses: response('AgentJobResponse') });
  if (paths['/agent/jobs/{id}/cancel']?.post) Object.assign(paths['/agent/jobs/{id}/cancel'].post, { summary: 'Request cooperative cancellation of an agent job', responses: { '202': { description: 'Cancellation accepted', content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentJobResponse' } } } }, '404': { $ref: '#/components/responses/NotFound' } } });
  if (paths['/agent/activity']?.get) Object.assign(paths['/agent/activity'].get, {
    summary: 'List attributed agent revisions using a stable cursor',
    parameters: [{ name: 'cursor', in: 'query', schema: { type: 'string' } }, { name: 'runId', in: 'query', schema: { type: 'string' } }, { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } }],
  });
  if (paths['/agent/events']?.get) Object.assign(paths['/agent/events'].get, { summary: 'Stream attributed agent job and review events', responses: { '200': { description: 'Server-sent event stream', content: { 'text/event-stream': { schema: { type: 'string' } } } } } });
  ['users', 'accounts', 'administrators', 'groups', 'categories', 'statuses'].forEach((collection) => {
    const listOperation = paths[`/admin/${collection}`]?.get;
    if (listOperation) Object.assign(listOperation, {
      summary: `Search and page administrator ${collection}`,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 1000000, default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } },
        { name: 'q', in: 'query', schema: { type: 'string', maxLength: 100 } },
      ],
      responses: response('AdminCollectionResponse'),
    });
    const detailOperation = paths[`/admin/${collection}/{id}`]?.get;
    if (detailOperation) Object.assign(detailOperation, {
      summary: `Get one administrator ${collection} record`,
      responses: { ...response('AdminDetailResponse'), '404': { $ref: '#/components/responses/NotFound' } },
    });
  });
  ['/civic/platform/tenants/preview', '/tenants/{tenantId}/civic/platform/tenants/preview'].forEach((route) => {
    if (paths[route]?.post) Object.assign(paths[route].post, { summary: 'Preview normalized tenant configuration without saving', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CivicTenant' } } } }, responses: response('CivicTenantPreviewResponse') });
  });
  ['/civic/platform/tenants/{managedTenantId}/readiness', '/tenants/{tenantId}/civic/platform/tenants/{managedTenantId}/readiness'].forEach((route) => {
    if (paths[route]?.get) Object.assign(paths[route].get, { summary: 'Validate fail-closed tenant launch readiness', responses: response('CivicTenantReadinessResponse') });
  });
  ['/civic/platform/tenants/{managedTenantId}/export', '/tenants/{tenantId}/civic/platform/tenants/{managedTenantId}/export'].forEach((route) => {
    if (paths[route]?.get) Object.assign(paths[route].get, { summary: 'Export a portable secret-free tenant configuration', responses: response('PortableCivicTenantConfiguration') });
  });
}

function concreteAgentPath(openApiPath) {
  return openApiPath.replace(/{tenantId}/g, 'fixtheph').replace(/{[^}]+}/g, '507f1f77bcf86cd799439011');
}

function agentPolicy(method, openApiPath) {
  const candidate = concreteAgentPath(openApiPath);
  return agentPolicies.find((policy) => (
    (policy.method === '*' || policy.method === method.toUpperCase())
    && new RegExp(policy.pattern, 'i').test(candidate)
  )) || null;
}

function applyAgentPolicies(spec) {
  Object.entries(spec.paths).forEach(([openApiPath, methods]) => {
    Object.entries(methods).forEach(([method, operation]) => {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) return;
      const policy = agentPolicy(method, openApiPath);
      delete operation['x-required-agent-scope'];
      delete operation['x-agent-mutation-kind'];
      delete operation['x-agent-operation-id'];
      delete operation['x-agent-tenant-scoped'];
      delete operation['x-human-authority-required'];
      operation['x-agent-allowed'] = Boolean(policy?.agentAllowed);
      operation.security = (operation.security || []).filter((item) => !Object.hasOwn(item, 'AgentBearerAuth'));
      if (policy?.agentAllowed) {
        operation['x-agent-operation-id'] = policy.operationId;
        if (policy.requiredScope) operation['x-required-agent-scope'] = policy.requiredScope;
        if (policy.mutationKind) operation['x-agent-mutation-kind'] = policy.mutationKind;
        if (policy.tenantScoped) operation['x-agent-tenant-scoped'] = true;
        operation.security.push({ AgentBearerAuth: [] });
        if (!['get', 'head'].includes(method) && openApiPath !== '/agent/validate') {
          operation.parameters ||= [];
          const parameterNames = new Set(operation.parameters.map((parameter) => String(parameter.name || '').toLowerCase()));
          const addHeader = (name, description, schema) => {
            if (!parameterNames.has(name.toLowerCase())) operation.parameters.push({ name, in: 'header', required: false, description, schema });
          };
          addHeader('X-Agent-Run-Id', 'Required for AgentBearerAuth mutations; identifies the attributable run.', { type: 'string', minLength: 4, maxLength: 120 });
          addHeader('Idempotency-Key', 'Required for AgentBearerAuth mutations; reuse only for an identical retry.', { type: 'string', minLength: 8, maxLength: 200 });
          addHeader('X-Agent-Source-Manifest', 'Optional JSON array of bounded source references used for attribution and source-required policies.', { type: 'string', maxLength: 50000 });
          if (policy.mutationKind === 'propose_edit') addHeader('If-Match', 'Base revision identifier required for an agent proposal against accepted content.', { type: 'string' });
        }
      } else if (policy && !policy.agentAllowed) {
        operation['x-agent-operation-id'] = policy.operationId;
        operation['x-human-authority-required'] = true;
      }
      if (!operation.security.length) delete operation.security;
    });
  });
}

const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
spec.info.version = '1.1.0';
spec.info.description = 'Stable v1 contract for Wikitruth browser, civic-tenant, administrative, and accountable software-agent integrations.';
spec.servers = [{ url: '/api/v1', description: 'Stable v1' }, { url: '/api', description: 'Compatibility alias' }];
spec['x-version-policy'] = 'docs/api/API_VERSION_POLICY.md';
addComponents(spec);
const routes = mountedRoutes();
const missing = [];
routes.forEach((route) => {
  spec.paths[route.path] ||= {};
  if (!spec.paths[route.path][route.method]) {
    missing.push(route);
    if (write) spec.paths[route.path][route.method] = genericOperation(route);
  }
});
specialize(spec);
applyAgentPolicies(spec);

if (write) {
  fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`);
  console.log(`OpenAPI synchronized: ${routes.length} mounted operations; ${missing.length} added.`);
} else if (missing.length) {
  console.error(`OpenAPI is missing ${missing.length} mounted operation(s):`);
  missing.forEach((route) => console.error(`- ${route.method.toUpperCase()} ${route.path} (${route.source})`));
  process.exitCode = 1;
} else {
  console.log(`OpenAPI coverage complete: ${routes.length} mounted operations.`);
}
