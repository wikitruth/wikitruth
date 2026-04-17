import type { LegacyEntity, LegacyResponse } from './legacy';

export interface ApiBaseResponse {
  success?: boolean;
  message?: string;
  error?: unknown;
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
  entrySet?: Array<{
    entries?: LegacyEntity[];
  }>;
  topicsMore?: boolean;
  argumentsMore?: boolean;
  questionsMore?: boolean;
  answersMore?: boolean;
  issuesMore?: boolean;
  opinionsMore?: boolean;
  artifactsMore?: boolean;
}

export interface SearchResponse extends ApiBaseResponse, EntityBuckets {
  tab?: string;
  content?: string;
  results?: boolean;
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
  tagLabels?: LegacyEntity[];
  hasValue?: boolean;
  linkCount?: number;
  verdict?: LegacyEntity;
  categories?: LegacyEntity[];
  topics?: LegacyEntity[];
  keyTopics?: LegacyEntity[];
  topicChildren?: LegacyEntity[];
  topicSiblings?: LegacyEntity[];
  topicSiblingsMore?: boolean;
  topicLinks?: LegacyEntity[];
  parentTopic?: LegacyEntity;
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
  hasValue?: boolean;
  questions?: LegacyEntity[];
  issues?: LegacyEntity[];
  opinions?: LegacyEntity[];
}

export interface QuestionEntryResponse extends ApiBaseResponse {
  question?: LegacyEntity;
  hasValue?: boolean;
  answers?: LegacyEntity[];
  issues?: LegacyEntity[];
  opinions?: LegacyEntity[];
}

export interface IssueEntryResponse extends ApiBaseResponse {
  issue?: LegacyEntity;
  hasValue?: boolean;
  opinions?: LegacyEntity[];
}

export interface OpinionEntryResponse extends ApiBaseResponse {
  opinion?: LegacyEntity;
  hasValue?: boolean;
  issues?: LegacyEntity[];
  opinions?: LegacyEntity[];
}

export interface AnswerEntryResponse extends ApiBaseResponse {
  answer?: LegacyEntity;
  hasValue?: boolean;
  issues?: LegacyEntity[];
  opinions?: LegacyEntity[];
}

export interface ArtifactEntryResponse extends ApiBaseResponse {
  artifact?: LegacyEntity;
  hasValue?: boolean;
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

export interface MemberDiaryResponse extends MemberContributionsResponse {
  categories?: LegacyEntity[];
  rootTopics?: LegacyEntity[];
}

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
