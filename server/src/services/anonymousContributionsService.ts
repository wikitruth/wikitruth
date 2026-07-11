import crypto from 'crypto';

export const ANONYMOUS_ENTRY_TYPES = [
  'topic',
  'argument',
  'question',
  'answer',
  'issue',
  'opinion',
  'artifact',
] as const;

export type AnonymousEntryType = (typeof ANONYMOUS_ENTRY_TYPES)[number];

export type AnonymousContributionInput = {
  entryType: AnonymousEntryType;
  title: string;
  content: string;
  references: string;
  parentType: string;
  parentId: string;
  contactEmail: string;
};

export type AnonymousContributionLimits = {
  minimumFormAgeMs: number;
  maximumTitleLength: number;
  maximumContentLength: number;
  maximumReferencesLength: number;
  maximumLinks: number;
};

type ValidationResult =
  | { ok: true; value: AnonymousContributionInput }
  | { ok: false; message: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_PATTERN = /^[a-f0-9]{64}$/;

function cleanText(value: unknown): string {
  return String(value || '').trim();
}

export function parseAnonymousContribution(
  body: Record<string, unknown>,
  limits: AnonymousContributionLimits,
): ValidationResult {
  const entryType = cleanText(body.entryType).toLowerCase() as AnonymousEntryType;
  const title = cleanText(body.title);
  const content = cleanText(body.content);
  const references = cleanText(body.references);
  const parentType = cleanText(body.parentType).toLowerCase();
  const parentId = cleanText(body.parentId);
  const contactEmail = cleanText(body.contactEmail).toLowerCase();

  if (!ANONYMOUS_ENTRY_TYPES.includes(entryType)) {
    return { ok: false, message: 'Choose a supported contribution type.' };
  }
  if (title.length < 5 || title.length > limits.maximumTitleLength) {
    return { ok: false, message: `Title must be 5-${limits.maximumTitleLength} characters.` };
  }
  if (content.length < 20 || content.length > limits.maximumContentLength) {
    return { ok: false, message: `Contribution must be 20-${limits.maximumContentLength} characters.` };
  }
  if (references.length > limits.maximumReferencesLength) {
    return { ok: false, message: `References must not exceed ${limits.maximumReferencesLength} characters.` };
  }
  if (contactEmail && !EMAIL_PATTERN.test(contactEmail)) {
    return { ok: false, message: 'Contact email is not valid.' };
  }
  if (parentId && parentId.length > 120) {
    return { ok: false, message: 'Parent identifier is too long.' };
  }

  return {
    ok: true,
    value: { entryType, title, content, references, parentType, parentId, contactEmail },
  };
}

export function assessAnonymousRisk(
  input: AnonymousContributionInput,
  limits: AnonymousContributionLimits,
): { score: number; flags: string[] } {
  const flags: string[] = [];
  const linkCount = (input.content.match(/https?:\/\//gi) || []).length
    + (input.references.match(/https?:\/\//gi) || []).length;
  const repeatedCharacter = /(.)\1{11,}/i.test(`${input.title} ${input.content}`);
  const uppercaseLetters = input.content.replace(/[^A-Z]/g, '').length;
  const letters = input.content.replace(/[^A-Za-z]/g, '').length;

  if (linkCount > limits.maximumLinks) flags.push('excessive_links');
  if (repeatedCharacter) flags.push('repeated_characters');
  if (letters >= 40 && uppercaseLetters / letters > 0.65) flags.push('mostly_uppercase');
  if (!input.references && input.entryType === 'artifact') flags.push('artifact_without_reference');

  return { score: Math.min(100, flags.length * 25), flags };
}

export function hashAnonymousIdentity(secret: string, ip: string, userAgent: string): string {
  return crypto.createHmac('sha256', secret).update(`${ip}\n${userAgent}`).digest('hex');
}

export function hashReceipt(secret: string, receipt: string): string {
  return crypto.createHmac('sha256', secret).update(receipt).digest('hex');
}

export function createReceipt(): string {
  return crypto.randomBytes(24).toString('base64url');
}

export function contentFingerprint(secret: string, input: AnonymousContributionInput): string {
  const normalized = [input.entryType, input.title, input.content, input.references, input.parentType, input.parentId]
    .map((part) => part.trim().replace(/\s+/g, ' ').toLowerCase())
    .join('\n');
  return crypto.createHmac('sha256', secret).update(normalized).digest('hex');
}

export function receiptMatches(expectedHash: string, actualHash: string): boolean {
  if (!HEX_PATTERN.test(expectedHash) || !HEX_PATTERN.test(actualHash)) return false;
  return crypto.timingSafeEqual(Buffer.from(expectedHash, 'hex'), Buffer.from(actualHash, 'hex'));
}

export function anonymousAdoptionUrl(entryType: AnonymousEntryType, id: string): string {
  const plural = entryType === 'opinion' ? 'opinions' : `${entryType}s`;
  return `/${plural}/create?anonymousSubmission=${encodeURIComponent(id)}`;
}
