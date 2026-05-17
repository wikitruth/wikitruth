'use strict';

const fs = require('fs');
const path = require('path');

const DRIFT_PLAN_PATH = path.join(
  process.cwd(),
  'docs/plans/completed/LEGACY_MODERN_URL_FORMAT_DRIFT_CHECKLIST_PLAN_2026-04-22.md'
);

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

function buildDriftKey(area, legacyNormalizedPath, modernCanonicalPath) {
  return `${stripBackticks(area)}||${stripBackticks(legacyNormalizedPath)}||${stripBackticks(modernCanonicalPath)}`;
}

describe('URL format drift approvals', function () {
  it('requires explicit approvals for all DRIFT rows and rejects unsynced approvals', function () {
    const source = fs.readFileSync(DRIFT_PLAN_PATH, 'utf8');

    const matrixSection = getSectionContent(source, 'URL Format Matrix (Legacy Prefix Ignored)');
    const approvalSection = getSectionContent(source, 'Drift Approval Register');

    const matrixRows = parseTableRows(matrixSection);
    const approvalRows = parseTableRows(approvalSection);

    const driftRows = matrixRows.filter((row) => stripBackticks(row.Status) === 'DRIFT');
    expect(driftRows.length).toBeGreaterThan(0);

    const driftById = new Map();
    driftRows.forEach((row) => {
      const notes = row['Drift notes'] || '';
      const approvalMatch = notes.match(/(URL-DRIFT-\d{3})/);
      expect(approvalMatch).not.toBeNull();

      const approvalId = approvalMatch[1];
      const driftKey = buildDriftKey(row.Area, row['Legacy path (normalized)'], row['Modern canonical path']);

      expect(driftById.has(approvalId)).toBe(false);
      driftById.set(approvalId, driftKey);
    });

    const approvalsById = new Map();
    approvalRows.forEach((row) => {
      const approvalId = stripBackticks(row['Approval ID']);
      const decision = stripBackticks(row.Decision).toUpperCase();
      expect(/^URL-DRIFT-\d{3}$/.test(approvalId)).toBe(true);
      expect(decision).toBe('APPROVED');
      expect(approvalsById.has(approvalId)).toBe(false);

      const approvalKey = buildDriftKey(row.Area, row['Legacy normalized path'], row['Modern canonical path']);
      approvalsById.set(approvalId, approvalKey);
    });

    driftById.forEach((driftKey, approvalId) => {
      expect(approvalsById.has(approvalId)).toBe(true);
      expect(approvalsById.get(approvalId)).toBe(driftKey);
    });

    approvalsById.forEach((_approvalKey, approvalId) => {
      expect(driftById.has(approvalId)).toBe(true);
    });
  });
});
