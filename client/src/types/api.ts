import type { LegacyEntity, LegacyResponse } from './legacy';
import type { Application, Artifact } from './index';

export interface ApiBaseResponse {
  success?: boolean;
  message?: string;
  error?: unknown;
}

export type AnonymousEntryType = 'topic' | 'argument' | 'question' | 'answer' | 'issue' | 'opinion' | 'artifact';
export type AnonymousContributionStatus = 'pending' | 'in_review' | 'accepted' | 'rejected';

export interface AnonymousContribution {
  _id?: string;
  id?: string;
  entryType: AnonymousEntryType;
  title: string;
  content?: string;
  references?: string;
  parentType?: string;
  parentId?: string;
  contactEmail?: string;
  status: AnonymousContributionStatus;
  risk?: { score?: number; flags?: string[] };
  moderation?: {
    reviewerUsername?: string;
    reason?: string;
    reviewedAt?: string;
    publishedEntryType?: string;
    publishedEntryId?: string | null;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface AnonymousContributionConfigResponse extends ApiBaseResponse {
  enabled: boolean;
  entryTypes: AnonymousEntryType[];
  limits: {
    perHour: number;
    perDay: number;
    minimumFormAgeMs: number;
    maximumTitleLength: number;
    maximumContentLength: number;
    maximumReferencesLength: number;
    maximumLinks: number;
  };
}

export interface AnonymousContributionResponse extends ApiBaseResponse {
  submission?: AnonymousContribution;
  submissions?: AnonymousContribution[];
  adoptionUrl?: string | null;
  receipt?: { id: string; token: string };
  status?: string;
}

export type LegacyApiResponse = LegacyResponse & ApiBaseResponse;

export type ReactionChannel = 'exposure' | 'vote' | 'value';
export type ExposureReaction = 'expose' | 'bury';
export type VoteReaction = 'upvote' | 'downvote';
export type ValueReaction = 'good' | 'bad';
export type ReactionValue = ExposureReaction | VoteReaction | ValueReaction;

export interface EntryReactionCounts {
  exposure: {
    expose: number;
    bury: number;
  };
  vote: {
    upvote: number;
    downvote: number;
  };
  value: {
    good: number;
    bad: number;
  };
}

export interface EntryReactionState {
  exposure: ExposureReaction | null;
  vote: VoteReaction | null;
  value: ValueReaction | null;
}

export interface EntryReactionsResponse extends ApiBaseResponse {
  action?: 'set' | 'updated' | 'cleared' | 'noop';
  target?: {
    id: string;
    objectName: string;
    objectType: number;
  };
  counts?: EntryReactionCounts;
  totals?: {
    exposure: number;
    vote: number;
    value: number;
  };
  myReactions?: EntryReactionState;
}

export type EntityBuckets = {
  topics?: LegacyEntity[];
  arguments?: LegacyEntity[];
  questions?: LegacyEntity[];
  answers?: LegacyEntity[];
  issues?: LegacyEntity[];
  opinions?: LegacyEntity[];
  artifacts?: LegacyEntity[];
};

export interface HomeDataResponse extends ApiBaseResponse, EntityBuckets {
  application?: LegacyEntity;
  applications?: LegacyEntity[];
  appCategories?: LegacyEntity[];
  diaryCategories?: LegacyEntity[];
  myGroups?: LegacyEntity[];
  entrySet?: Array<{
    entries?: LegacyEntity[];
  }>;
  rankings?: {
    formulas: { latest: string; trending: string; top: string; disclaimer: string };
    candidateCount: number;
    candidateWindow: string;
    buckets: { latest: LegacyEntity[]; trending: LegacyEntity[]; top: LegacyEntity[] };
  };
  topicsMore?: boolean;
  argumentsMore?: boolean;
  questionsMore?: boolean;
  answersMore?: boolean;
  issuesMore?: boolean;
  opinionsMore?: boolean;
  artifactsMore?: boolean;
}

export interface ApplicationContextResponse extends ApiBaseResponse {
  application?: Application | null;
  applications?: Application[];
  appCategories?: LegacyEntity[];
}

export interface OutlineTreeNode {
  _id: string;
  title: string;
  objectName: 'topic';
  friendlyUrl?: string;
  archived?: boolean;
  children: OutlineTreeNode[];
}

export interface OutlineTreeResponse extends ApiBaseResponse {
  tree?: OutlineTreeNode;
  trees?: OutlineTreeNode[];
  ancestors?: OutlineTreeNode[];
  truncated?: boolean;
}

export interface SearchResponse extends ApiBaseResponse, EntityBuckets {
  tab?: string;
  content?: string;
  results?: boolean;
  graphFilters?: {
    relationship: string;
    evidence: string;
  };
  topicsMore?: boolean;
  argumentsMore?: boolean;
  questionsMore?: boolean;
  answersMore?: boolean;
  artifactsMore?: boolean;
  issuesMore?: boolean;
  opinionsMore?: boolean;
}

export interface TopicEntryResponse extends ApiBaseResponse {
  topic?: LegacyEntity;
  entry?: LegacyEntity;
  topicLink?: LegacyEntity;
  tagLabels?: LegacyEntity[];
  hasValue?: boolean;
  linkCount?: number;
  verdict?: LegacyEntity;
  categories?: LegacyEntity[];
  topics?: LegacyEntity[];
  keyTopics?: LegacyEntity[];
  topicChildren?: LegacyEntity[];
  topicChildrenMore?: boolean;
  topicSiblings?: LegacyEntity[];
  topicSiblingsMore?: boolean;
  parentSiblings?: LegacyEntity[];
  parentSiblingsMore?: boolean;
  topicLinks?: LegacyEntity[];
  parentTopic?: LegacyEntity;
  grandParentTopic?: LegacyEntity;
  topicAncestors?: LegacyEntity[];
  mainTopic?: boolean;
  arguments?: LegacyEntity[];
  keyArguments?: LegacyEntity[];
  questions?: LegacyEntity[];
  artifacts?: LegacyEntity[];
  issues?: LegacyEntity[];
  opinions?: LegacyEntity[];
}

export interface ArgumentEntryResponse extends ApiBaseResponse {
  argument?: LegacyEntity;
  entry?: LegacyEntity;
  argumentLink?: LegacyEntity;
  hasValue?: boolean;
  topic?: LegacyEntity;
  parentTopic?: LegacyEntity;
  grandParentTopic?: LegacyEntity;
  topicLinks?: LegacyEntity[];
  questions?: LegacyEntity[];
  issues?: LegacyEntity[];
  opinions?: LegacyEntity[];
}

export interface QuestionEntryResponse extends ApiBaseResponse {
  question?: LegacyEntity;
  hasValue?: boolean;
  topic?: LegacyEntity;
  parentTopic?: LegacyEntity;
  grandParentTopic?: LegacyEntity;
  topicLinks?: LegacyEntity[];
  answers?: LegacyEntity[];
  issues?: LegacyEntity[];
  opinions?: LegacyEntity[];
}

export interface IssueEntryResponse extends ApiBaseResponse {
  issue?: LegacyEntity;
  hasValue?: boolean;
  topic?: LegacyEntity;
  parentTopic?: LegacyEntity;
  grandParentTopic?: LegacyEntity;
  topicLinks?: LegacyEntity[];
  opinions?: LegacyEntity[];
}

export interface OpinionEntryResponse extends ApiBaseResponse {
  opinion?: LegacyEntity;
  hasValue?: boolean;
  topic?: LegacyEntity;
  parentTopic?: LegacyEntity;
  grandParentTopic?: LegacyEntity;
  topicLinks?: LegacyEntity[];
  issues?: LegacyEntity[];
  opinions?: LegacyEntity[];
}

export interface AnswerEntryResponse extends ApiBaseResponse {
  answer?: LegacyEntity;
  hasValue?: boolean;
  topic?: LegacyEntity;
  parentTopic?: LegacyEntity;
  grandParentTopic?: LegacyEntity;
  topicLinks?: LegacyEntity[];
  issues?: LegacyEntity[];
  opinions?: LegacyEntity[];
}

export interface ArtifactEntryResponse extends ApiBaseResponse {
  artifact?: LegacyEntity & Partial<Artifact>;
  hasValue?: boolean;
  topic?: LegacyEntity;
  topicLinks?: LegacyEntity[];
  artifacts?: LegacyEntity[];
  arguments?: LegacyEntity[];
  questions?: LegacyEntity[];
  issues?: LegacyEntity[];
  opinions?: LegacyEntity[];
}

export interface GroupEntryResponse extends ApiBaseResponse {
  group?: LegacyEntity;
  contributors?: LegacyEntity[];
}

export interface GroupPostsResponse extends ApiBaseResponse {
  group?: LegacyEntity;
  posts?: EntityBuckets;
}

export interface GroupStatsResponse extends ApiBaseResponse {
  totals?: {
    topics: number;
    arguments: number;
    questions: number;
    answers: number;
    artifacts: number;
    issues: number;
    opinions: number;
    contributions: number;
  };
}

export interface GroupsListResponse extends ApiBaseResponse {
  publicGroups?: LegacyEntity[];
  privateGroups?: LegacyEntity[];
  groups?: LegacyEntity[];
}

export interface MemberProfileResponse extends ApiBaseResponse {
  member?: LegacyEntity;
}

export interface MemberTopicsResponse extends ApiBaseResponse {
  member?: LegacyEntity;
  topics?: LegacyEntity[];
}

export interface MemberContributionsResponse extends ApiBaseResponse, EntityBuckets {
  counts?: {
    all?: number;
    topics?: number;
    arguments?: number;
    questions?: number;
    answers?: number;
    artifacts?: number;
    issues?: number;
    opinions?: number;
  };
  member?: LegacyEntity;
  tab?: string;
  results?: boolean;
  topicsMore?: boolean;
  argumentsMore?: boolean;
  questionsMore?: boolean;
  answersMore?: boolean;
  artifactsMore?: boolean;
  issuesMore?: boolean;
  opinionsMore?: boolean;
}

export interface MemberJournalResponse extends MemberContributionsResponse {
  categories?: LegacyEntity[];
  rootTopics?: LegacyEntity[];
}

// Backward compatibility alias for legacy diary terminology.
export type MemberDiaryResponse = MemberJournalResponse;

export interface MemberFollowingGraph {
  people?: LegacyEntity[];
  users?: LegacyEntity[];
  topics?: LegacyEntity[];
  groups?: LegacyEntity[];
}

export interface MemberFollowingResponse extends ApiBaseResponse {
  member?: LegacyEntity;
  following?: MemberFollowingGraph;
}

export interface MemberPagesResponse extends ApiBaseResponse {
  pages?: LegacyEntity[];
}

export interface MemberPageResponse extends ApiBaseResponse {
  page?: LegacyEntity;
}

export interface MemberFastSwitchState {
  enabled?: boolean;
  trustedClients?: number;
}

export interface MemberFastSwitchResponse extends ApiBaseResponse {
  fastSwitch?: MemberFastSwitchState;
}

export interface InstallStatusResponse extends ApiBaseResponse {
  install?: {
    databaseEmpty: boolean;
    initialized: boolean;
    hasAdmin: boolean;
    tokenConfigured: boolean;
    tokenRequired: boolean;
    backupReady: boolean;
    requiredCollections: string[];
    missingCollections: string[];
    eligible: boolean;
    adminRestorePath: string | null;
  };
}

export interface InstallRestoreResponse extends ApiBaseResponse {
  restore?: {
    completedAt?: string;
    summary?: unknown;
  };
}

export interface PublicPageResponse extends ApiBaseResponse {
  page?: LegacyEntity;
  parent?: LegacyEntity | null;
}
