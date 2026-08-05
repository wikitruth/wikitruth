import type { AuthUser } from '../types/auth';
import type { StructuredDebatePilotRecord } from '../types/structuredDebate';

export function structuredDebateUserId(user?: AuthUser | null): string {
  return String(user?._id || user?.id || '').trim();
}

export function structuredDebatePublicUsername(user?: AuthUser | null): string {
  return String(user?.username || '').trim().slice(0, 80);
}

export function canCreateStructuredDebate(user?: AuthUser | null): boolean {
  return Boolean(user?.roles?.admin || user?.roles?.reviewer);
}

export function canFacilitateStructuredDebate(
  pilot: StructuredDebatePilotRecord,
  user?: AuthUser | null,
): boolean {
  const id = structuredDebateUserId(user);
  return Boolean(id && (user?.roles?.admin || pilot.facilitatorUserIds.some((value) => String(value) === id)));
}

export function structuredDebateEntryPath(
  objectName: string,
  entryId: unknown,
  friendlyUrl: unknown,
): string {
  const id = encodeURIComponent(String(entryId || ''));
  const friendly = encodeURIComponent(String(friendlyUrl || '').trim());
  const roots: Record<string, string> = {
    topic: 'topics', argument: 'arguments', question: 'questions', answer: 'answers',
    issue: 'issues', opinion: 'opinions', artifact: 'artifacts',
  };
  const root = roots[objectName] || `${objectName}s`;
  return `/${root}/entry/${friendly ? `${friendly}/` : ''}${id}`;
}
