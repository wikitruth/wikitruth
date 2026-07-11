#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import mongoose from 'mongoose';

const require = createRequire(import.meta.url);
const config = require('../../server/src/config/config.js');
const runDate = new Date().toISOString().slice(0, 10);
const outputPath = process.argv[2] || path.join('docs', 'qa', 'artifacts', `content-policy-pilot-${runDate}`, 'manifest.json');

const FAMILIES = [
  { name: 'topic', collection: 'topics', objectType: 1 },
  { name: 'argument', collection: 'arguments', objectType: 2 },
  { name: 'question', collection: 'questions', objectType: 3 },
  { name: 'artifact', collection: 'artifacts', objectType: 6 },
  { name: 'issue', collection: 'issues', objectType: 10 },
  { name: 'opinion', collection: 'opinions', objectType: 11 },
  { name: 'answer', collection: 'answers', objectType: 12 },
];
const CRITICAL_ISSUE_TYPES = [10, 20, 30, 40, 45];

function normalizeTitle(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function scopeKey(entry) {
  return [entry.ownerType ?? '', entry.ownerId ?? '', entry.parentId ?? '', entry.groupId ?? '', Boolean(entry.private)].join(':');
}

function publicEntry(entry, family) {
  return {
    family,
    id: String(entry._id || ''),
    title: String(entry.title || ''),
    ownerType: entry.ownerType ?? null,
    ownerId: entry.ownerId ? String(entry.ownerId) : null,
    editDate: entry.editDate || null,
  };
}

async function main() {
  const connection = await mongoose.createConnection(config.mongodb.uri, { serverSelectionTimeoutMS: 10_000 }).asPromise();
  try {
    const familyResults = [];
    const sampledEntries = [];
    const duplicateCandidates = [];
    const revisionCollection = connection.collection('entryrevisions');

    for (const family of FAMILIES) {
      const collection = connection.collection(family.collection);
      const entries = await collection.find({ private: { $ne: true } })
        .project({ title: 1, ownerType: 1, ownerId: 1, parentId: 1, groupId: 1, private: 1, editDate: 1 })
        .sort({ editDate: -1 })
        .limit(100)
        .toArray();
      const sample = entries.slice(0, 5).map((entry) => publicEntry(entry, family.name));
      sampledEntries.push(...sample);

      const byScopedTitle = new Map();
      for (const entry of entries) {
        const key = `${scopeKey(entry)}:${normalizeTitle(entry.title)}`;
        const rows = byScopedTitle.get(key) || [];
        rows.push(entry);
        byScopedTitle.set(key, rows);
      }
      for (const rows of byScopedTitle.values()) {
        if (rows.length > 1 && normalizeTitle(rows[0]?.title)) {
          duplicateCandidates.push({
            family: family.name,
            title: String(rows[0].title || ''),
            ids: rows.map((row) => String(row._id)),
            rule: 'exact_title_same_scope',
          });
        }
      }

      const sampleIds = sample.map((entry) => new mongoose.Types.ObjectId(entry.id));
      const revisionCoverage = sampleIds.length
        ? await revisionCollection.distinct('objectId', { objectType: family.objectType, objectId: { $in: sampleIds } })
        : [];
      familyResults.push({
        family: family.name,
        inspectedPublicEntries: entries.length,
        sampleCount: sample.length,
        sampleWithRevision: revisionCoverage.length,
      });
    }

    const artifactCollection = connection.collection('artifacts');
    const artifacts = await artifactCollection.find({ private: { $ne: true } })
      .project({ artifactType: 1, provenance: 1 })
      .limit(100)
      .toArray();
    const artifactsWithProvenance = artifacts.filter((entry) => {
      const provenance = entry.provenance || {};
      return Boolean(entry.artifactType && provenance.originType && (provenance.creator || provenance.publisher || provenance.archiveUrl || provenance.checksum));
    }).length;
    const artifactsWithQualityReview = artifacts.filter((entry) => Number.isFinite(Number(entry.provenance?.sourceQuality?.total))).length;

    const verdictCoverage = {};
    for (const family of FAMILIES.filter((item) => ['topic', 'argument', 'answer'].includes(item.name))) {
      const collection = connection.collection(family.collection);
      const total = await collection.countDocuments({ private: { $ne: true } });
      const independentChannels = await collection.countDocuments({
        private: { $ne: true },
        'verdicts.factual.status': { $exists: true },
        'verdicts.ethical.status': { $exists: true },
      });
      verdictCoverage[family.name] = { total, independentChannels };
    }

    const issueCollection = connection.collection('issues');
    const unresolvedAcceptedCriticalIssues = await issueCollection.countDocuments({
      private: { $ne: true },
      issueType: { $in: CRITICAL_ISSUE_TYPES },
      'screening.status': 1,
      'resolution.status': { $nin: ['resolved', 'dismissed'] },
    });

    const manifest = {
      generatedAt: new Date().toISOString(),
      mode: 'read-only-live-sample',
      sampleLimitPerFamily: 5,
      inspectedLimitPerFamily: 100,
      policies: [
        'DUPLICATE_AND_MERGE_POLICY.md',
        'SOURCE_QUALITY_RUBRIC.md',
        'MODERATION_PLAYBOOK.md',
        'TRUTH_AND_ETHICS_VERDICT_POLICY.md',
        'ISSUE_FIRST_AND_DISCUSSION_OBSOLESCENCE_POLICY.md',
      ],
      familyResults,
      sampledEntries,
      exactDuplicateCandidates: duplicateCandidates,
      evidenceAdoption: {
        artifactsInspected: artifacts.length,
        artifactsWithProvenance,
        artifactsWithQualityReview,
      },
      verdictCoverage,
      unresolvedAcceptedCriticalIssues,
      findings: [
        duplicateCandidates.length
          ? `${duplicateCandidates.length} scoped exact-title duplicate candidate group(s) require moderator review.`
          : 'No scoped exact-title duplicate candidates were found in the inspected public sample.',
        `${artifactsWithProvenance}/${artifacts.length} inspected artifacts currently contain richer provenance.`,
        `${artifactsWithQualityReview}/${artifacts.length} inspected artifacts currently contain a source-quality review.`,
        `${unresolvedAcceptedCriticalIssues} accepted critical issue(s) currently remain unresolved.`,
      ],
      passed: true,
      passMeaning: 'The policy pilot executed read-only and produced actionable evidence; adoption gaps are not execution failures.',
    };

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    console.log(`Content policy pilot manifest: ${outputPath}`);
    console.log(manifest.findings.join('\n'));
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error(`Content policy pilot failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
