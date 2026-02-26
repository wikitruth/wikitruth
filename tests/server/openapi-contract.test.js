'use strict';

const fs = require('fs');
const path = require('path');

function readOpenApi() {
  const file = path.join(process.cwd(), 'docs/api/openapi.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

describe('OpenAPI contract', function () {
  it('defines core auth endpoints used by modern client', function () {
    const spec = readOpenApi();
    const paths = spec.paths || {};

    expect(paths['/auth/me']).toBeDefined();
    expect(paths['/auth/login']).toBeDefined();
    expect(paths['/auth/signup']).toBeDefined();
    expect(paths['/auth/logout']).toBeDefined();
    expect(paths['/auth/forgot-password']).toBeDefined();
    expect(paths['/auth/reset-password']).toBeDefined();
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
      '/members/{username}/following',
      '/admin',
      '/admin/users',
      '/admin/db-backup',
      '/monitoring/errors',
      '/realtime/events',
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
    ].forEach((schemaName) => expect(schemas[schemaName]).toBeDefined());
  });
});
