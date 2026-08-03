'use strict';

export type EntryExtras = Record<string, unknown> & {
  title?: string;
  contextTitle?: string;
  friendlyUrl?: string;
  shortTitle?: string;
  objectType?: number;
  objectName?: string;
  getType?: () => number;
  content?: string;
  contentPreview?: string;
  showMore?: boolean;
  comments?: number;
  points?: number;
  editDate?: Date;
  createDate?: Date;
  editDateString?: string;
  createDateString?: string;
  createUserId?: { toString(): string; equals(id: unknown): boolean };
  editUserId?: { toString(): string };
  sameEditor?: boolean;
  sameEditDate?: boolean;
  referenceDate?: Date;
  referenceDateString?: string;
  referenceDateUTC?: string;
  referenceDateSimple?: string;
  childrenCount?: Record<string, { accepted?: number } | undefined>;
  hasChildren?: boolean;
  isItemOwner?: boolean;
};

type EntryExtrasDeps = {
  constants: {
    SETTINGS: {
      TILE_MAX_ENTRY_LEN: number;
      contentPreviewLength: number;
    };
  };
  utils: {
    urlify: (value: unknown) => string;
    getShortText: (text: unknown, length: number) => string;
    timeSince: (value: unknown, short?: boolean) => string;
  };
  dateFns: {
    format: (value: Date, format: string) => string;
  };
  getObjectName: (objectType?: number) => string;
  appendOwnerFlag: (
    req?: { user?: { id?: unknown } },
    item?: { createUserId?: { equals(id: unknown): boolean }; isItemOwner?: boolean },
    model?: { isItemOwner?: boolean },
  ) => void;
};

export function appendListExtrasCore(
  item: EntryExtras | undefined,
  objectType: number | undefined,
  shortTitleLength: number | undefined,
  deps: EntryExtrasDeps,
): void {
  if (!item) {
    return;
  }

  if (item.title) {
    item.friendlyUrl = deps.utils.urlify(item.title);
    item.shortTitle = deps.utils.getShortText(
      item.contextTitle || item.title,
      shortTitleLength || deps.constants.SETTINGS.TILE_MAX_ENTRY_LEN,
    );
  }

  if (objectType) {
    item.objectType = objectType;
    item.objectName = deps.getObjectName(objectType);
  } else if (item.getType) {
    objectType = item.getType();
    item.objectType = objectType;
    item.objectName = deps.getObjectName(objectType);
  }

  if (
    item.content &&
    item.contentPreview &&
    item.content.length > deps.constants.SETTINGS.contentPreviewLength &&
    item.contentPreview !== item.content
  ) {
    item.showMore = true;
  }
}

export function appendEntryExtrasCore(
  item: EntryExtras | undefined,
  objectType: number | undefined,
  req: { user?: { id?: unknown } } | undefined,
  shortTitleLength: number | undefined,
  deps: EntryExtrasDeps,
): void {
  if (!item) {
    return;
  }

  appendListExtrasCore(item, objectType, shortTitleLength, deps);
  item.editDateString = deps.utils.timeSince(item.editDate, true) + ' ago';
  item.createDateString = deps.utils.timeSince(item.createDate, true) + ' ago';
  item.sameEditor = item.createUserId?.toString() === item.editUserId?.toString();
  item.sameEditDate = item.createDate?.valueOf() === item.editDate?.valueOf();

  if (item.referenceDate) {
    const refDate = new Date(item.referenceDate);
    item.referenceDateString = item.referenceDate.toLocaleString();
    item.referenceDateUTC = item.referenceDate.toUTCString();
    if (!Number.isNaN(refDate.getTime())) {
      item.referenceDateSimple = deps.dateFns.format(refDate, 'PP p');
    } else {
      item.referenceDateSimple = item.referenceDate.toLocaleString();
    }
    if (item.referenceDateSimple && /,?\s*12:00 AM$/.test(item.referenceDateSimple)) {
      item.referenceDateSimple = item.referenceDateSimple.replace(/,?\s*12:00 AM$/, '');
    }
  }

  if (item.childrenCount) {
    const childrenCount = item.childrenCount;
    const hasChildren = function (objectName: string) {
      const c = childrenCount[objectName];
      return !!c && (c.accepted ?? 0) > 0;
    };

    if (
      hasChildren('topics') ||
      hasChildren('arguments') ||
      hasChildren('questions') ||
      hasChildren('answers') ||
      hasChildren('artifacts') ||
      hasChildren('issues') ||
      hasChildren('opinions')
    ) {
      item.hasChildren = true;
    }
  }

  if (req) {
    deps.appendOwnerFlag(req, item);
  }
}
