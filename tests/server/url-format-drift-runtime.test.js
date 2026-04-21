'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');
const registerLegacyPathRedirects = require('../../server/src/middlewares/routes');

const DRIFT_PLAN_PATH = path.join(
  process.cwd(),
  'docs/plans/LEGACY_MODERN_URL_FORMAT_DRIFT_CHECKLIST_PLAN_2026-04-22.md'
);

const FIXTURE_CASES_BY_AREA = {
  'Topic entry (singular legacy)': [
    {
      requestPath: '/topic/sample-topic/topic001',
      expectedLocation: '/topics/entry/sample-topic/topic001',
    },
  ],
  'Argument entry (singular legacy)': [
    {
      requestPath: '/argument/sample-argument/arg001',
      expectedLocation: '/arguments/entry/sample-argument/arg001',
    },
  ],
  'Question entry (singular legacy)': [
    {
      requestPath: '/question/sample-question/question001',
      expectedLocation: '/questions/entry/sample-question/question001',
    },
  ],
  'Answer entry (singular legacy)': [
    {
      requestPath: '/answer/sample-answer/answer001',
      expectedLocation: '/answers/entry/answer001',
    },
  ],
  'Issue entry (singular legacy)': [
    {
      requestPath: '/issue/sample-issue/issue001',
      expectedLocation: '/issues/entry/sample-issue/issue001',
    },
  ],
  'Opinion entry (singular legacy)': [
    {
      requestPath: '/opinion/sample-opinion/opinion001',
      expectedLocation: '/opinions/entry/sample-opinion/opinion001',
    },
  ],
  'Artifact entry (singular legacy)': [
    {
      requestPath: '/artifact/sample-artifact/artifact001',
      expectedLocation: '/artifacts/entry/sample-artifact/artifact001',
    },
  ],
  'Forgot password': [
    {
      requestPath: '/login/forgot',
      expectedLocation: '/forgot-password',
    },
  ],
  'Reset password token route': [
    {
      requestPath: '/login/reset/user%40example.com/token-123',
      expectedLocation: '/reset-password?email=user%40example.com&token=token-123',
    },
  ],
  'Member journal (legacy diary path)': [
    {
      requestPath: '/members/demo/diary',
      expectedLocation: '/members/demo/journal',
    },
  ],
  'Legacy related flow': [
    {
      requestPath: '/related?topic=topic123',
      expectedLocation: '/topics/entry/topic123',
    },
    {
      requestPath: '/related',
      expectedLocation: '/explore',
    },
  ],
  'Legacy verdict update flow': [
    {
      requestPath: '/verdict/update?argument=arg001',
      expectedLocation: '/admin/verdicts/arg001?argument=arg001&type=argument',
    },
  ],
  'Legacy outline create flow': [
    {
      requestPath: '/outline/create?topic=topic001',
      expectedLocation: '/outline/link?topic=topic001&parentId=topic001&parentType=topic',
    },
  ],
  'Legacy topic-link edit flow': [
    {
      requestPath: '/topics/link/edit?id=topicLink001',
      expectedLocation: '/topics/entry/topicLink001?id=topicLink001&topicLink=topicLink001&mode=edit-link',
    },
  ],
  'Legacy argument-link edit flow': [
    {
      requestPath: '/arguments/link/edit?id=argumentLink001',
      expectedLocation: '/arguments/entry/argumentLink001?id=argumentLink001&argumentLink=argumentLink001&mode=edit-link',
    },
  ],
};

function stripBackticks(value) {
  return String(value || '').replace(/`/g, '').trim();
}

function getSectionContent(source, headingTitle) {
  const lines = source.split('\n');
  const headingNeedle = `## ${headingTitle}`.trim();
  const startIndex = lines.findIndex((line) => line.trim() === headingNeedle);
  if (startIndex === -1) {
    throw new Error(`Missing section heading: ${headingNeedle}`);
  }

  let endIndex = lines.length;
  for (let idx = startIndex + 1; idx < lines.length; idx += 1) {
    if (lines[idx].startsWith('## ')) {
      endIndex = idx;
      break;
    }
  }

  return lines.slice(startIndex + 1, endIndex).join('\n');
}

function parseTableRows(sectionContent) {
  const tableLines = sectionContent
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'));

  if (tableLines.length < 3) {
    throw new Error('Expected markdown table with header, divider, and rows');
  }

  const parseCells = (line) =>
    line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim());

  const headerCells = parseCells(tableLines[0]);
  const rows = [];

  for (let idx = 2; idx < tableLines.length; idx += 1) {
    const cells = parseCells(tableLines[idx]);
    if (cells.length !== headerCells.length) {
      continue;
    }
    const row = {};
    headerCells.forEach((header, headerIndex) => {
      row[header] = cells[headerIndex];
    });
    rows.push(row);
  }

  return rows;
}

describe('URL format drift runtime redirects', function () {
  it('covers every DRIFT and ALIAS matrix row with representative runtime fixtures', async function () {
    const source = fs.readFileSync(DRIFT_PLAN_PATH, 'utf8');
    const matrixSection = getSectionContent(source, 'URL Format Matrix (Legacy Prefix Ignored)');
    const matrixRows = parseTableRows(matrixSection);

    const rowsToVerify = matrixRows.filter((row) => {
      const status = stripBackticks(row.Status);
      return status === 'DRIFT' || status === 'ALIAS';
    });
    expect(rowsToVerify.length).toBeGreaterThan(0);

    const matrixAreas = rowsToVerify.map((row) => stripBackticks(row.Area));
    const missingFixtures = matrixAreas.filter((area) => !Object.prototype.hasOwnProperty.call(FIXTURE_CASES_BY_AREA, area));
    const extraFixtures = Object.keys(FIXTURE_CASES_BY_AREA).filter((area) => !matrixAreas.includes(area));

    expect(missingFixtures).toEqual([]);
    expect(extraFixtures).toEqual([]);

    const app = express();
    registerLegacyPathRedirects(app, null);

    for (const row of rowsToVerify) {
      const area = stripBackticks(row.Area);
      const fixtures = FIXTURE_CASES_BY_AREA[area];
      expect(Array.isArray(fixtures)).toBe(true);
      expect(fixtures.length).toBeGreaterThan(0);

      // Use representative fixture IDs for each matrix row.
      for (const fixture of fixtures) {
        const res = await request(app).get(fixture.requestPath).expect(302);
        expect(res.headers.location).toBe(fixture.expectedLocation);
      }
    }
  });
});
