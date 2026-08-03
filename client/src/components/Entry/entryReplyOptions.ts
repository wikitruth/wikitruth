import type { LegacyEntity } from '../../types/legacy';

export type SupportedEntryObjectName =
  | 'topic'
  | 'argument'
  | 'question'
  | 'answer'
  | 'issue'
  | 'opinion'
  | 'artifact';

export type EntryReplyOption = {
  key: string;
  label: string;
  iconClass: string;
  to: string;
  dividerBefore?: boolean;
};

export function normalizeEntryObjectName(value: unknown): SupportedEntryObjectName {
  const raw = String(value || '').trim().toLowerCase();
  if (
    raw === 'topic' ||
    raw === 'argument' ||
    raw === 'question' ||
    raw === 'answer' ||
    raw === 'issue' ||
    raw === 'opinion' ||
    raw === 'artifact'
  ) {
    return raw;
  }
  return 'topic';
}

export function getTopicIdForReply(entry: LegacyEntity, objectName: string): string {
  if (objectName === 'topic') {
    return String(entry._id || '');
  }
  return String(entry.ownerId || entry.topicId || entry.parentTopic?._id || '');
}

export function buildEntryReplyOptions(
  entry: LegacyEntity,
  objectName: SupportedEntryObjectName,
): EntryReplyOption[] {
  const items: EntryReplyOption[] = [];
  const entryId = String(entry._id || '');
  const topicId = getTopicIdForReply(entry, objectName);
  const encodeCurrentContext = (basePath: string) =>
    `${basePath}?${encodeURIComponent(objectName)}=${encodeURIComponent(entryId)}`;
  const createTopicId = encodeURIComponent(topicId || entryId);
  const hasQuestionContext = Boolean(entry.parentQuestion?._id) || objectName === 'question';

  if (objectName !== 'issue' && objectName !== 'opinion') {
    if (!hasQuestionContext) {
      if (objectName !== 'argument') {
        items.push({
          key: 'new-topic',
          label: 'New Topic',
          iconClass: 'glyphicon glyphicon-edit',
          to: `/topics/create?topic=${createTopicId}`,
        });
      }
      items.push(
        {
          key: 'new-fact',
          label: 'New Fact',
          iconClass: 'glyphicon glyphicon-flash',
          to: encodeCurrentContext('/arguments/create'),
        },
        {
          key: 'new-question',
          label: 'New Question',
          iconClass: 'fa fa-question-circle',
          to: encodeCurrentContext('/questions/create'),
        },
        {
          key: 'new-artifact',
          label: 'New Artifact',
          iconClass: 'fa fa-puzzle-piece',
          to: encodeCurrentContext('/artifacts/create'),
        },
        {
          key: 'new-issue',
          label: 'New Issue',
          iconClass: 'fa fa-exclamation-circle',
          to: encodeCurrentContext('/issues/create'),
          dividerBefore: true,
        },
      );
    } else if (objectName !== 'answer') {
      items.push(
        {
          key: 'new-answer',
          label: 'New Answer',
          iconClass: 'fa fa-check-circle-o',
          to: encodeCurrentContext('/answers/create'),
        },
        {
          key: 'new-issue',
          label: 'New Issue',
          iconClass: 'fa fa-exclamation-circle',
          to: encodeCurrentContext('/issues/create'),
          dividerBefore: true,
        },
      );
    } else {
      items.push({
        key: 'new-issue',
        label: 'New Issue',
        iconClass: 'fa fa-exclamation-circle',
        to: encodeCurrentContext('/issues/create'),
      });
    }
  }

  items.push({
    key: 'new-comment',
    label: 'New Comment',
    iconClass: 'fa fa-comments-o',
    to: encodeCurrentContext('/opinions/create'),
    dividerBefore: items.length > 0 && !items[items.length - 1].dividerBefore,
  });

  return items;
}
