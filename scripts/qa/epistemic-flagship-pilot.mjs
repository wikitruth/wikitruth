#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import mongoose from 'mongoose';
import {
  apiCall,
  assertLocalPilotTargets,
  authenticatedSession,
  cleanupPilot,
  insertPilotIdentity,
  pilotStamp,
} from './epistemic-pilot-support.mjs';

const require = createRequire(import.meta.url);
const config = require('../../server/src/config/config.js');
const baseUrl = process.argv[2] || process.env.WT_EPISTEMIC_BASE_URL || 'https://127.0.0.1:9443';
const reportPath = process.argv[3] || path.join('docs', 'qa', 'EPISTEMIC_FLAGSHIP_PILOT_REPORT_2026-07-18.json');
const TYPE = { topic: 1, argument: 2, artifact: 6, issue: 10, civicRecord: 40 };

function createFixture() {
  const token = pilotStamp();
  return {
    token,
    topicId: new mongoose.Types.ObjectId(),
    claimId: new mongoose.Types.ObjectId(),
    artifactIds: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
    issueId: new mongoose.Types.ObjectId(),
    civicRecordId: new mongoose.Types.ObjectId(),
    title: `Epistemic pilot ${token}`,
  };
}

async function insertFixture(connection, fixture, creator) {
  const now = new Date();
  const accepted = { status: 1, history: [{ userId: creator.userId, date: now, status: 1 }] };
  await connection.collection('topics').insertOne({
    _id: fixture.topicId,
    title: fixture.title,
    content: 'Disposable subject used to validate the complete governed knowledge workflow.',
    friendlyUrl: `epistemic-pilot-${fixture.token}`,
    screening: accepted,
    private: false,
    createDate: now,
    editDate: now,
    createUserId: creator.userId,
    editUserId: creator.userId,
  });
  await connection.collection('arguments').insertOne({
    _id: fixture.claimId,
    title: `${fixture.title} claim`,
    content: 'The documented pilot evidence supports this deliberately disposable factual claim.',
    references: 'See the two provenance-bearing pilot artifacts.',
    friendlyUrl: `epistemic-pilot-claim-${fixture.token}`,
    ownerType: TYPE.topic,
    ownerId: fixture.topicId,
    categoryId: fixture.topicId,
    typeId: 1,
    screening: accepted,
    private: false,
    createDate: now,
    editDate: now,
    createUserId: creator.userId,
    editUserId: creator.userId,
  });
  const artifacts = fixture.artifactIds.map((artifactId, index) => ({
    _id: artifactId,
    title: `${fixture.title} source ${index + 1}`,
    content: `Independent pilot source ${index + 1} with inspectable origin and verification notes.`,
    source: `https://example.test/epistemic-pilot/${fixture.token}/source-${index + 1}`,
    friendlyUrl: `epistemic-pilot-source-${index + 1}-${fixture.token}`,
    artifactType: index === 0 ? 'document' : 'dataset',
    ownerType: TYPE.argument,
    ownerId: fixture.claimId,
    categoryId: fixture.topicId,
    provenance: {
      originType: index === 0 ? 'primary' : 'secondary',
      creator: `Pilot source creator ${index + 1}`,
      publisher: 'Wikitruth disposable QA',
      publicationDate: now,
      captureDate: now,
      archiveUrl: `https://archive.example.test/${fixture.token}/${index + 1}`,
      checksum: `sha256:${fixture.token}${index + 1}`,
      accessLimitations: 'None for this disposable fixture.',
      verifiabilityNotes: 'The source is synthetic and exists only to verify provenance plumbing.',
    },
    screening: accepted,
    private: false,
    createDate: now,
    editDate: now,
    createUserId: creator.userId,
    editUserId: creator.userId,
  }));
  await connection.collection('artifacts').insertMany(artifacts);
  await connection.collection('issues').insertOne({
    _id: fixture.issueId,
    title: `${fixture.title} evidence gate`,
    content: 'Confirm both sources are reviewed before assigning a factual verdict.',
    friendlyUrl: `epistemic-pilot-issue-${fixture.token}`,
    issueType: 10,
    ownerType: TYPE.argument,
    ownerId: fixture.claimId,
    categoryId: fixture.topicId,
    screening: accepted,
    resolution: { status: 'open', reason: '' },
    private: false,
    createDate: now,
    editDate: now,
    createUserId: creator.userId,
    editUserId: creator.userId,
  });
  await connection.collection('civicrecords').insertOne({
    _id: fixture.civicRecordId,
    tenantId: 'fixtheph',
    countryCode: 'PH',
    kind: 'incident',
    title: `${fixture.title} civic record`,
    friendlyUrl: `epistemic-pilot-civic-${fixture.token}`,
    summary: 'Disposable civic record for validating evidence linkage.',
    description: 'This fixture verifies that the generic civic layer can cite governed Wikitruth evidence.',
    status: 'pending',
    stage: 'reported',
    severity: 'info',
    private: false,
    history: [],
    createDate: now,
    editDate: now,
    createUserId: creator.userId,
    editUserId: creator.userId,
  });
  await connection.collection('tenantmemberships').insertOne({
    tenantId: 'fixtheph',
    userId: creator.userId,
    roles: ['admin'],
    active: true,
    createUserId: creator.userId,
    editUserId: creator.userId,
    createDate: now,
    editDate: now,
  });
}

function target(type, id) {
  return { type, id: String(id) };
}

async function castVote(session, fixture, channel) {
  const status = channel === 'factual' ? 'supported' : 'permissible';
  return apiCall(session, 'POST', '/api/v1/moderation/verdict-votes', {
    ...target(TYPE.argument, fixture.claimId),
    channel,
    channelStatus: status,
    rationale: `${session.identity.username} independently reviewed both provenance-bearing sources.`,
    framework: channel === 'ethical' ? 'public-interest proportionality' : '',
    evidenceRefs: fixture.artifactIds.map(String),
    confidence: 90,
    expertise: 'Epistemic workflow quality assurance',
    conflictDeclared: false,
  });
}

async function overrideVerdict(admin, fixture, status, reason) {
  return apiCall(admin, 'PUT', '/api/v1/moderation/verdict-channel', {
    ...target(TYPE.argument, fixture.claimId),
    channel: 'factual',
    status,
    reasoning: `Administrator final say records ${status} while preserving the consensus snapshot.`,
    evidenceRefs: fixture.artifactIds.map(String),
    acknowledgeOverride: true,
    overrideReason: reason,
  });
}

async function exerciseWorkflow(connection, fixture, sessions, steps) {
  const [admin, reviewerOne, reviewerTwo, reviewerThree, reader] = sessions;
  const initialAudit = await apiCall(admin, 'GET', '/api/v1/admin/audit-events/verify');
  assert.equal(initialAudit.verification.valid, true, 'Existing privileged audit chain must be valid');
  steps.push('initial-audit-chain-valid');

  for (const [index, artifactId] of fixture.artifactIds.entries()) {
    const review = await apiCall(sessions[index + 1], 'PUT', '/api/v1/moderation/artifact-quality', {
      ...target(TYPE.artifact, artifactId),
      scores: index === 0
        ? { identity: 4, proximity: 4, integrity: 4, recency: 3, reproducibility: 4 }
        : { identity: 4, proximity: 3, integrity: 4, recency: 4, reproducibility: 3 },
      notes: `Independent source-quality review ${index + 1} completed through the governed API.`,
    });
    assert.ok(review.sourceQuality.total >= 18, 'Expected a strong reviewed source-quality score');
  }
  steps.push('provenance-and-source-quality-reviewed');

  const issueResolution = await apiCall(reviewerThree, 'PUT', '/api/v1/moderation/issue-resolution', {
    ...target(TYPE.issue, fixture.issueId),
    status: 'resolved',
    reason: 'Both independent sources now have provenance and completed source-quality reviews.',
  });
  assert.equal(issueResolution.resolution.status, 'resolved');
  steps.push('accepted-critical-issue-resolved');

  let factualDecision;
  for (const reviewer of [reviewerOne, reviewerTwo, reviewerThree]) factualDecision = await castVote(reviewer, fixture, 'factual');
  assert.equal(factualDecision.summary.consensusReached, true);
  assert.equal(factualDecision.decision.published, true);
  steps.push('factual-consensus-published');

  let ethicalDecision;
  for (const reviewer of [reviewerOne, reviewerTwo, reviewerThree]) ethicalDecision = await castVote(reviewer, fixture, 'ethical');
  assert.equal(ethicalDecision.summary.consensusReached, true);
  assert.equal(ethicalDecision.decision.published, true);
  steps.push('ethical-consensus-published');

  await overrideVerdict(admin, fixture, 'refuted', 'Pilot administrator temporarily overrides consensus to verify explicit final-say controls.');
  await overrideVerdict(admin, fixture, 'supported', 'Pilot administrator reverses the exception and restores the evidence-supported final outcome.');
  steps.push('admin-final-say-and-reversal');

  const signal = await apiCall(reader, 'POST', '/api/v1/moderation/signals', {
    ...target(TYPE.argument, fixture.claimId),
    signalType: 'needs_reevaluation',
    note: 'Reader requests a future reevaluation if the cited evidence changes.',
  });
  const appeal = await apiCall(reader, 'POST', '/api/v1/moderation/appeals', {
    ...target(TYPE.argument, fixture.claimId),
    reasonType: 'verdict',
    note: 'Please preserve the original consensus and administrator exception history.',
  });
  assert.ok(signal.signal._id && appeal.appeal._id);
  steps.push('reader-signal-and-appeal');

  const civicLink = await apiCall(admin, 'POST', `/api/v1/tenants/fixtheph/civic/records/${fixture.civicRecordId}/links`, {
    relationship: 'evidence',
    objectId: String(fixture.artifactIds[0]),
  });
  assert.ok(civicLink.link._id);
  steps.push('tenant-scoped-civic-evidence-link');

  const revisions = await apiCall(admin, 'GET', `/api/v1/timeline/revisions?objectName=argument&id=${fixture.claimId}`);
  assert.ok(revisions.total >= 4, `Expected consensus and override revisions, found ${revisions.total}`);
  const finalEntry = await connection.collection('arguments').findOne({ _id: fixture.claimId });
  assert.equal(finalEntry.verdicts.factual.status, 'supported');
  assert.equal(finalEntry.verdicts.factual.decisionMode, 'admin_override');
  assert.equal(finalEntry.verdicts.ethical.status, 'permissible');
  assert.equal(finalEntry.verdicts.ethical.decisionMode, 'consensus');
  const unresolvedIssues = await connection.collection('issues').countDocuments({
    ownerId: fixture.claimId,
    'resolution.status': { $nin: ['resolved', 'dismissed'] },
  });
  assert.equal(unresolvedIssues, 0);
  const finalAudit = await apiCall(admin, 'GET', '/api/v1/admin/audit-events/verify');
  assert.equal(finalAudit.verification.valid, true, 'Privileged audit chain must remain valid after workflow');
  steps.push('revision-history-and-final-audit-verified');

  return {
    agreement: {
      factual: factualDecision.summary,
      ethical: ethicalDecision.summary,
    },
    decisionPath: ['factual consensus: supported', 'ethical consensus: permissible', 'administrator override: refuted', 'administrator reversal: supported'],
    provenanceCoverage: { artifacts: 2, reviewedArtifacts: 2, evidenceRefsPerVote: 2 },
    revisions: { total: revisions.total, summaries: revisions.revisions.map((revision) => revision.summary) },
    unresolvedIssues,
    feedback: { signalId: String(signal.signal._id), appealId: String(appeal.appeal._id) },
    civicEvidenceLinkId: String(civicLink.link._id),
    audit: { before: initialAudit.verification, after: finalAudit.verification },
  };
}

async function main() {
  assertLocalPilotTargets(baseUrl, config.mongodb.uri);
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  const connection = await mongoose.createConnection(config.mongodb.uri, { serverSelectionTimeoutMS: 10_000 }).asPromise();
  const fixture = createFixture();
  const identities = [];
  const sessions = [];
  const steps = [];
  let evidence = null;
  let runError = null;
  let cleanupResidue = null;
  try {
    identities.push(await insertPilotIdentity(connection, 'qa_epi_admin', { admin: true }));
    identities.push(await insertPilotIdentity(connection, 'qa_epi_review1', { reviewer: true }));
    identities.push(await insertPilotIdentity(connection, 'qa_epi_review2', { reviewer: true }));
    identities.push(await insertPilotIdentity(connection, 'qa_epi_review3', { reviewer: true }));
    identities.push(await insertPilotIdentity(connection, 'qa_epi_reader'));
    await insertFixture(connection, fixture, identities[0]);
    steps.push('disposable-identities-and-epistemic-fixture-created');
    for (const identity of identities) sessions.push(await authenticatedSession(baseUrl, identity));
    steps.push('admin-reviewer-reader-sessions-authenticated');
    evidence = await exerciseWorkflow(connection, fixture, sessions, steps);
  } catch (error) {
    runError = error;
  } finally {
    await Promise.all(sessions.map((session) => session.context.dispose()));
    cleanupResidue = await cleanupPilot(connection, fixture, identities);
    await connection.close();
  }
  const report = {
    result: runError ? 'FAIL' : 'PASS',
    generatedAt: new Date().toISOString(),
    baseUrl,
    policyVersion: '2026-07-v2',
    fixture: { token: fixture.token, identities: identities.length, topic: 1, claim: 1, artifacts: 2, criticalIssues: 1, civicRecords: 1 },
    steps,
    evidence,
    cleanup: { mutableFixtureResidue: cleanupResidue, immutableEventEvidenceRetained: true, credentialsRetained: false },
    operatingWork: ['Seed real-world evidence with non-test provenance.', 'Recruit and onboard independent subject-matter reviewers.'],
    error: runError instanceof Error ? runError.message : runError ? String(runError) : null,
  };
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  assert.ok(Object.values(cleanupResidue || {}).every((count) => count === 0), `Mutable fixture residue remained: ${JSON.stringify(cleanupResidue)}`);
  if (runError) throw runError;
  console.log(`Epistemic flagship pilot passed: ${reportPath}`);
  console.log(`Decision path: ${evidence.decisionPath.join(' -> ')}`);
  console.log(`Revisions: ${evidence.revisions.total}; audit events verified: ${evidence.audit.after.verifiedEvents}`);
  console.log('Mutable fixtures removed; immutable event evidence retained by design.');
}

main().catch((error) => {
  console.error(`Epistemic flagship pilot failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
