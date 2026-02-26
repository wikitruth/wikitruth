import type { LegacyEntity, LegacyResponse } from './legacy';

export interface ApiBaseResponse {
  success?: boolean;
  message?: string;
  error?: unknown;
}

export type LegacyApiResponse = LegacyResponse & ApiBaseResponse;

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
  categories?: LegacyEntity[];
  topics?: LegacyEntity[];
  arguments?: LegacyEntity[];
  questions?: LegacyEntity[];
  artifacts?: LegacyEntity[];
  issues?: LegacyEntity[];
  opinions?: LegacyEntity[];
}

export interface ArgumentEntryResponse extends ApiBaseResponse {
  argument?: LegacyEntity;
  questions?: LegacyEntity[];
  issues?: LegacyEntity[];
  opinions?: LegacyEntity[];
}

export interface QuestionEntryResponse extends ApiBaseResponse {
  question?: LegacyEntity;
  answers?: LegacyEntity[];
  issues?: LegacyEntity[];
  opinions?: LegacyEntity[];
}

export interface IssueEntryResponse extends ApiBaseResponse {
  issue?: LegacyEntity;
  opinions?: LegacyEntity[];
}

export interface OpinionEntryResponse extends ApiBaseResponse {
  opinion?: LegacyEntity;
  issues?: LegacyEntity[];
  opinions?: LegacyEntity[];
}

export interface AnswerEntryResponse extends ApiBaseResponse {
  answer?: LegacyEntity;
  issues?: LegacyEntity[];
  opinions?: LegacyEntity[];
}

export interface ArtifactEntryResponse extends ApiBaseResponse {
  artifact?: LegacyEntity;
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
