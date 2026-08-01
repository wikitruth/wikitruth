'use strict';

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

function readOpenApi() {
  const file = path.join(process.cwd(), 'docs/api/openapi.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

describe('OpenAPI contract', function () {
  it('covers every mounted controller operation', function () {
    expect(() => childProcess.execFileSync(process.execPath, ['scripts/openapi/check-openapi-coverage.mjs'], {
      cwd: process.cwd(), stdio: 'pipe',
    })).not.toThrow();
  });

  it('publishes the stable v1 and compatibility server policy', function () {
    const spec = readOpenApi();
    expect(spec.info.version).toBe('1.1.0');
    expect(spec.servers).toEqual(expect.arrayContaining([
      expect.objectContaining({ url: '/api/v1' }), expect.objectContaining({ url: '/api' }),
    ]));
    expect(spec['x-version-policy']).toBe('docs/api/API_VERSION_POLICY.md');
  });
  it('defines core auth endpoints used by modern client', function () {
    const spec = readOpenApi();
    const paths = spec.paths || {};

    expect(paths['/auth/me']).toBeDefined();
    expect(paths['/auth/providers']).toBeDefined();
    expect(paths['/auth/config']).toBeDefined();
    expect(paths['/auth/login']).toBeDefined();
    expect(paths['/auth/signup']).toBeDefined();
    expect(paths['/auth/logout']).toBeDefined();
    expect(paths['/auth/forgot-password']).toBeDefined();
    expect(paths['/auth/reset-password']).toBeDefined();
    expect(paths['/auth/token']).toBeDefined();
    expect(paths['/auth/token/refresh']).toBeDefined();
    expect(paths['/auth/token/revoke']).toBeDefined();
  });

  it('defines mutation contracts for core content entities', function () {
    const spec = readOpenApi();
    const paths = spec.paths || {};

    [
      '/home',
      '/search',
      '/topics',
      '/topics/entry/{id}',
      '/arguments',
      '/arguments/entry/{id}',
      '/questions',
      '/questions/entry/{id}',
      '/answers',
      '/answers/entry/{id}',
      '/issues',
      '/issues/entry/{id}',
      '/opinions',
      '/opinions/entry/{id}',
      '/artifacts',
      '/artifacts/entry/{id}',
      '/groups',
      '/groups/entry/{id}',
      '/groups/entry/{id}/posts',
      '/members',
      '/members/{username}',
      '/members/{username}/topics',
      '/members/{username}/journal',
      '/members/{username}/diary',
      '/members/{username}/following',
      '/admin',
      '/admin/users',
      '/admin/users/{id}/password',
      '/admin/users/{id}/role-admin',
      '/admin/users/{id}/role-account',
      '/admin/users/{id}/roles',
      '/admin/accounts/{id}/user',
      '/admin/accounts/{id}/notes',
      '/admin/accounts/{id}/status',
      '/admin/administrators/{id}/permissions',
      '/admin/administrators/{id}/groups',
      '/admin/administrators/{id}/user',
      '/admin/db-backup',
      '/moderation/entry',
      '/moderation/screening',
      '/moderation/verdict',
      '/moderation/take-ownership',
      '/moderation/ownership-migration',
      '/moderation/delete',
      '/monitoring/errors',
      '/reactions',
      '/realtime/events',
      '/civic/overview',
      '/civic/tenant',
      '/civic/me',
      '/civic/jurisdictions',
      '/civic/records',
      '/civic/records/{id}',
      '/civic/records/{id}/links',
      '/civic/records/{recordId}/links/{linkId}',
      '/civic/records/{id}/transition',
      '/civic/candidates/compare',
      '/civic/platform/tenants',
      '/civic/admin/jurisdictions',
      '/civic/admin/jurisdictions/{id}',
      '/civic/admin/membership-candidates',
      '/civic/platform/tenants/{managedTenantId}/memberships/{userId}',
      '/agent/identity',
      '/agent/capabilities',
      '/agent/validate',
      '/agent/activity',
      '/agent/runs/{runId}',
      '/agent/events',
      '/notifications/preferences',
      '/notifications/outbox',
      '/notifications/outbox/{id}/retry',
      '/epistemic/{objectName}/{id}/truth-summary',
      '/epistemic/{objectName}/{id}/evidence-bundle',
      '/epistemic/{objectName}/{id}/evidence-bundle.jsonld',
      '/epistemic/health',
      '/translations/{objectName}/{id}',
      '/translations/moderation/review/{id}',
      '/civic/records/{id}/responses',
      '/civic/responses/{id}/review',
      '/civic/platform/tenants/preview',
      '/civic/platform/tenants/{managedTenantId}/readiness',
      '/civic/platform/tenants/{managedTenantId}/export',
      '/admin/api-clients',
      '/admin/api-clients/{id}/rotate',
      '/admin/api-clients/{id}',
      '/outline/link',
      '/moderation/verdict-votes',
      '/moderation/signals',
      '/moderation/appeals',
      '/tenants/{tenantId}/civic/records',
      '/tenants/{tenantId}/civic/records/{id}',
      '/tenants/{tenantId}/civic/admin/jurisdictions/{id}',
      '/tenants/{tenantId}/civic/me',
      '/tenants/{tenantId}/civic/admin/membership-candidates',
    ].forEach((contractPath) => expect(paths[contractPath]).toBeDefined());
  });

  it('defines reusable DTO schemas for auth and mutation envelopes', function () {
    const spec = readOpenApi();
    const schemas = spec.components?.schemas || {};

    [
      'AuthUserResponse',
      'SuccessMessageResponse',
      'LoginRequest',
      'SignupRequest',
      'TopicMutationRequest',
      'TopicMutationResponse',
      'ArgumentMutationRequest',
      'ArgumentMutationResponse',
      'QuestionMutationRequest',
      'QuestionMutationResponse',
      'AnswerMutationRequest',
      'AnswerMutationResponse',
      'IssueMutationRequest',
      'IssueMutationResponse',
      'OpinionMutationRequest',
      'OpinionMutationResponse',
      'ArtifactMutationRequest',
      'ArtifactMutationResponse',
      'StandardApiResponse',
      'GenericMutationRequest',
      'PaginationMeta',
      'PaginatedApiResponse',
      'MobileTokenRequest',
      'MobileRefreshTokenRequest',
      'MobileTokenResponse',
      'CivicRecord',
      'CivicRecordMutationRequest',
      'CivicTransitionRequest',
      'CivicRecordResponse',
      'CivicRecordsResponse',
      'CivicOverviewResponse',
      'CivicTenant',
      'CivicJurisdiction',
      'CivicEntryLink',
      'CivicEntryRelationship',
      'CivicActorContext',
      'CivicMembershipUser',
      'CivicTenantMembership',
      'ApiErrorResponse',
      'ApiClientIdentity',
      'ApiClientCreateRequest',
      'ApiClientCredentialResponse',
      'AgentCapabilities',
      'GraphLinkRequest',
      'VerdictVoteRequest',
      'AdminFinalSayRequest',
      'AdminCollectionResponse',
      'AdminDetailResponse',
      'CivicExtensionField',
      'CivicExtensionSchema',
      'CivicTenantReadiness',
      'CivicTenantPreview',
      'PortableCivicTenantConfiguration',
      'PublicTruthSummary',
      'PublicEvidenceBundle',
      'PublicEvidenceJsonLd',
      'EntryTranslationRequest',
      'NotificationPreferences',
      'AgentValidationRequest',
    ].forEach((schemaName) => expect(schemas[schemaName]).toBeDefined());
  });

  it('defines mobile contract headers and auth security scheme', function () {
    const spec = readOpenApi();
    const securitySchemes = spec.components?.securitySchemes || {};
    const homeGet = spec.paths?.['/home']?.get;
    const headers = homeGet?.responses?.['200']?.headers || {};

    expect(securitySchemes.BearerAuth).toBeDefined();
    expect(securitySchemes.AgentBearerAuth).toBeDefined();
    expect(headers['RateLimit-Limit']).toBeDefined();
    expect(headers['RateLimit-Remaining']).toBeDefined();
    expect(headers['RateLimit-Reset']).toBeDefined();
    expect(headers.Deprecation).toBeDefined();
    expect(headers.Sunset).toBeDefined();
  });

  it('documents agent scopes and final-say separation', function () {
    const spec = readOpenApi();
    expect(spec.paths['/topics'].post['x-required-agent-scope']).toBe('contributions:write');
    expect(spec.paths['/outline/link'].post['x-required-agent-scope']).toBe('graph:write');
    expect(spec.paths['/moderation/verdict-votes'].post['x-required-agent-scope']).toBe('moderation:write');
    expect(spec.paths['/moderation/verdict-channel'].put.description).toMatch(/unavailable to API clients/i);
  });

  it('documents searchable paginated admin collections and direct details', function () {
    const spec = readOpenApi();
    ['users', 'accounts', 'administrators', 'groups', 'categories', 'statuses'].forEach((collection) => {
      const list = spec.paths[`/admin/${collection}`].get;
      const detail = spec.paths[`/admin/${collection}/{id}`].get;
      expect(list.parameters.map((parameter) => parameter.name)).toEqual(['page', 'limit', 'q']);
      expect(list.responses['200'].content['application/json'].schema.$ref)
        .toBe('#/components/schemas/AdminCollectionResponse');
      expect(detail.responses['200'].content['application/json'].schema.$ref)
        .toBe('#/components/schemas/AdminDetailResponse');
    });
  });

  it('documents graph discovery and portable public evidence contracts', function () {
    const spec = readOpenApi();
    const searchParameters = spec.paths['/search'].get.parameters;
    expect(searchParameters).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'relationship' }),
      expect.objectContaining({ name: 'evidence' }),
    ]));
    expect(spec.paths['/epistemic/{objectName}/{id}/evidence-bundle'].get.responses['200'].content['application/json'].schema.$ref)
      .toBe('#/components/schemas/PublicEvidenceBundle');
    expect(spec.paths['/epistemic/{objectName}/{id}/evidence-bundle.jsonld'].get.responses['200'].content['application/ld+json'].schema.$ref)
      .toBe('#/components/schemas/PublicEvidenceJsonLd');
    expect(spec.paths['/civic/platform/tenants/{managedTenantId}/export'].get.responses['200'].content['application/json'].schema.$ref)
      .toBe('#/components/schemas/PortableCivicTenantConfiguration');
  });
});
