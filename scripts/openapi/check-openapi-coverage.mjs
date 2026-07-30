#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const specPath = path.join(root, 'docs/api/openapi.json');
const write = process.argv.includes('--write');
const groups = [
  ['/home', ['home.ts']], ['/application-context', ['applicationContext.ts']],
  ['/topics', ['topics.ts']], ['/arguments', ['arguments.ts']], ['/questions', ['questions.ts']],
  ['/answers', ['answers.ts']], ['/artifacts', ['artifacts.ts']], ['/issues', ['issues.ts']],
  ['/opinions', ['opinions.ts']], ['/search', ['search.ts']], ['/groups', ['groups.ts']],
  ['/members', ['members.ts']], ['/auth', ['auth.ts', 'authOnboardingRoutes.ts', 'authPasskeyRoutes.ts']], ['/contact', ['contact.ts']],
  ['/admin', ['admin.ts', 'adminCollectionRoutes.ts', 'adminBackupRoutes.ts', 'adminApiClientRoutes.ts']],
  ['/moderation', ['moderation.ts', 'moderationArtifactRoutes.ts', 'moderationDuplicateRoutes.ts', 'moderationIssueRoutes.ts', 'moderationRevisionRoutes.ts', 'moderationSignalsRoutes.ts', 'moderationVerdictChannelRoutes.ts']],
  ['/outline', ['outline.ts']], ['/monitoring', ['monitoring.ts']], ['/realtime', ['realtime.ts']],
  ['/reactions', ['reactions.ts']], ['/notifications', ['notifications.ts']], ['/timeline', ['timeline.ts']],
  ['/install', ['install.ts']], ['/pages', ['pages.ts']], ['/anonymous-contributions', ['anonymousContributions.ts']],
  ['/agent', ['agent.ts']],
  ['/civic', ['civic.ts', 'civicAdministration.ts', 'civicEntryLinks.ts', 'civicResponses.ts']],
  ['/tenants/{tenantId}/civic', ['civic.ts', 'civicAdministration.ts', 'civicEntryLinks.ts', 'civicResponses.ts']],
  ['/epistemic', ['epistemic.ts']], ['/translations', ['translations.ts']],
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
    type: 'object', required: ['clientId', 'name', 'scopes', 'ownerUserId'],
    properties: { clientId: { type: 'string' }, name: { type: 'string' }, scopes: { type: 'array', items: { type: 'string' } }, ownerUserId: { type: 'string' }, expiresAt: { type: 'string', format: 'date-time', nullable: true } },
    example: { clientId: '4f86a29c50bc49a1b540a8d1', name: 'Research agent', scopes: ['entries:read', 'contributions:write'], ownerUserId: '66f000000000000000000001' },
  };
  schemas.ApiClientCreateRequest = {
    type: 'object', required: ['name', 'ownerUserId', 'scopes'],
    properties: { name: { type: 'string', maxLength: 120 }, ownerUserId: { type: 'string' }, scopes: { type: 'array', items: { type: 'string', enum: ['entries:read', 'contributions:write', 'graph:write', 'civic:write', 'moderation:write', 'admin:write'] } }, expiresAt: { type: 'string', format: 'date-time', nullable: true }, rateLimitPerMinute: { type: 'integer', minimum: 1, maximum: 1000 } },
  };
  schemas.ApiClientCredentialResponse = { type: 'object', properties: { success: { type: 'boolean' }, token: { type: 'string', description: 'Shown once; store securely' }, client: { $ref: '#/components/schemas/ApiClientIdentity' } } };
  schemas.AgentCapabilities = { type: 'object', properties: { identity: { $ref: '#/components/schemas/ApiClientIdentity' }, capabilities: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } } } };
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
  schemas.PublicEvidenceBundle = { type: 'object', required: ['schemaVersion', 'generatedAt', 'canonicalUrl', 'entry', 'relationships', 'translations'], properties: { schemaVersion: { type: 'string', enum: ['1.0'] }, generatedAt: { type: 'string', format: 'date-time' }, canonicalUrl: { type: 'string', format: 'uri' }, entry: { type: 'object' }, revision: { type: 'object', nullable: true }, truthSummary: { allOf: [{ $ref: '#/components/schemas/PublicTruthSummary' }], nullable: true }, relationships: { type: 'array', items: { type: 'object' } }, translations: { type: 'array', items: { type: 'object' } } } };
  schemas.PublicEvidenceJsonLd = { type: 'object', required: ['@context', '@id', '@type', 'identifier'], properties: { '@context': { type: 'object' }, '@id': { type: 'string', format: 'uri' }, '@type': { type: 'string' }, identifier: { type: 'string' }, citation: { type: 'array', items: { type: 'object' } } }, additionalProperties: true };
  schemas.EntryTranslationRequest = { type: 'object', required: ['locale', 'title', 'content'], properties: { locale: { type: 'string' }, title: { type: 'string', minLength: 3 }, content: { type: 'string', minLength: 10 } } };
  schemas.NotificationPreferences = { type: 'object', properties: { inApp: { type: 'boolean' }, emailDigest: { type: 'string', enum: ['off', 'daily', 'weekly'] }, webPush: { type: 'boolean' } } };
  schemas.AgentValidationRequest = { type: 'object', required: ['method', 'path'], properties: { method: { type: 'string' }, path: { type: 'string' }, body: { type: 'object' }, idempotencyKey: { type: 'string' }, run: { type: 'object' } } };
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
  if (paths['/outline/link']?.post) Object.assign(paths['/outline/link'].post, { summary: 'Create a governed knowledge-graph relationship', 'x-required-agent-scope': 'graph:write', security: [{ AgentBearerAuth: [] }, { BearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/GraphLinkRequest' } } } } });
  if (paths['/moderation/verdict-votes']?.post) Object.assign(paths['/moderation/verdict-votes'].post, { summary: 'Submit a channel-specific consensus vote', 'x-required-agent-scope': 'moderation:write', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/VerdictVoteRequest' } } } } });
  if (paths['/moderation/verdict-channel']?.put) Object.assign(paths['/moderation/verdict-channel'].put, { summary: 'Publish an explicit administrator final-say decision', description: 'This exceptional route is unavailable to API clients and records an audited override of the current consensus snapshot.', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AdminFinalSayRequest' } } } } });
  ['/topics', '/arguments', '/questions', '/answers', '/artifacts', '/issues', '/opinions'].forEach((route) => {
    if (paths[route]?.post) Object.assign(paths[route].post, { 'x-required-agent-scope': 'contributions:write', security: [{ AgentBearerAuth: [] }, { BearerAuth: [] }] });
  });
  ['/civic/records', '/tenants/{tenantId}/civic/records'].forEach((route) => {
    if (paths[route]?.post) Object.assign(paths[route].post, { 'x-required-agent-scope': 'civic:write', security: [{ AgentBearerAuth: [] }, { BearerAuth: [] }] });
  });
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
  if (paths['/translations/{objectName}/{id}']?.post) Object.assign(paths['/translations/{objectName}/{id}'].post, { summary: 'Submit a revision-linked entry translation', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/EntryTranslationRequest' } } } } });
  if (paths['/notifications/preferences']?.put) Object.assign(paths['/notifications/preferences'].put, { summary: 'Update notification delivery preferences', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/NotificationPreferences' } } } } });
  if (paths['/agent/validate']?.post) Object.assign(paths['/agent/validate'].post, { summary: 'Dry-run and validate an accountable agent mutation', security: [{ AgentBearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentValidationRequest' } } } } });
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
