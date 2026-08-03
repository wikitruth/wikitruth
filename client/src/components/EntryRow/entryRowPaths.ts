import type { LegacyEntity } from '../../types/legacy';
import type { EntryRowKind } from './EntryRowDetails';

export function getEntryRowPath(entry: LegacyEntity, kind: EntryRowKind): string {
  const id = encodeURIComponent(String(entry._id || ''));
  const friendly = encodeURIComponent(String(entry.friendlyUrl || entry.title || entry._id || ''));
  if (kind === 'answer' || kind === 'issue' || kind === 'opinion') {
    return `/${kind === 'issue' ? 'issues' : `${kind}s`}/entry/${id}`;
  }
  return `/${kind}s/entry/${friendly}/${id}`;
}
