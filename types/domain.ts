import type { AuthUser } from './auth';

export const OBJECT_TYPES = {
  topic: 1,
  topicLink: 32,
  argument: 2,
  argumentLink: 31,
  question: 3,
  definition: 5,
  artifact: 6,
  issue: 10,
  opinion: 11,
  answer: 12,
  user: 21,
  group: 30,
} as const;

export type ObjectType = (typeof OBJECT_TYPES)[keyof typeof OBJECT_TYPES];

export type ScreeningStatusCode = 0 | 1 | 2 | 3;

export interface ScreeningState {
  status: ScreeningStatusCode;
  history?: Array<{
    userId: string;
    date: Date | string;
    status: ScreeningStatusCode;
  }>;
}

export interface ChildrenCount {
  total?: number;
  accepted?: number;
  pending?: number;
  rejected?: number;
  [key: string]: number | undefined;
}

export interface VerdictState {
  status: number;
  editDate?: Date | string;
  editUserId?: string;
}

export interface EntryBase {
  _id?: string;
  title?: string;
  content?: string;
  tags?: number[];
  categoryId?: string;
  ownerId?: string;
  ownerType?: ObjectType;
  parentId?: string;
  private?: boolean;
  createUserId?: string;
  editUserId?: string;
  createDate?: Date | string;
  editDate?: Date | string;
  screening?: ScreeningState;
  childrenCount?: Record<string, ChildrenCount>;
  verdict?: VerdictState;
  issueType?: unknown;
  [key: string]: unknown;
}

export interface ApplicationDefinition {
  id: string;
  title: string;
  navTitle?: string;
  slogan?: string;
  exploreTopicId?: string;
  appCategories?: unknown[];
  resPath?: string;
  googleAnalyticsTrackingId?: string;
  domains?: string[];
  [key: string]: unknown;
}

export interface RequestContextUser extends AuthUser {
  id: string;
  username: string;
}
