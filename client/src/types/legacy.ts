export interface LegacyEntity {
  _id: string;
  id: string;
  friendlyUrl: string;
  title: string;
  subtitle: string;
  description: string;
  content: string;
  contentPreview: string;
  source: string;
  ownerId: string;
  ownerType: string;
  questionId: string;
  topicId: string;
  references: string;
  parentId: string | null;
  private: boolean;
  issueType: number;
  editDate: string | Date;
  createDate: string | Date;
  referenceDate?: string | Date;
  editorUsername: string;
  editUsername?: string;
  createUsername?: string;
  editDateString?: string;
  createDateString?: string;
  username: string;
  email: string;
  points?: number;
  discoveryRanking?: {
    positive?: number;
    negative?: number;
    total?: number;
    acceptedResponses?: number;
  };
  reputation?: import('./index').ReputationSnapshot | null;
  authorReputationScore?: number;
  authorReputationLevel?: string;
  screening?: {
    status?: number | string;
    history?: unknown[];
  };
  createUserId: string;
  roleType: number;
  file: {
    type: string;
    name: string;
    size?: number;
    lastModifiedDate?: string | Date;
  };
  filePath?: string | null;
  thumbnailPath?: string | null;
  parentTopic?: LegacyEntity;
  parentTopicLink?: LegacyEntity;
  parentArgument?: LegacyEntity;
  parentArgumentLink?: LegacyEntity;
  parentArtifact?: LegacyEntity;
  parentQuestion?: LegacyEntity;
  parentAnswer?: LegacyEntity;
  parentIssue?: LegacyEntity;
  parentOpinion?: LegacyEntity;
  topicLinks?: LegacyEntity[];
  childrenCount?: {
    topics?: { total?: number; accepted?: number; pending?: number; rejected?: number; archived?: number };
    arguments?: { total?: number; accepted?: number; pending?: number; rejected?: number; archived?: number };
    questions?: { total?: number; accepted?: number; pending?: number; rejected?: number; archived?: number };
    answers?: { total?: number; accepted?: number; pending?: number; rejected?: number; archived?: number };
    artifacts?: { total?: number; accepted?: number; pending?: number; rejected?: number; archived?: number };
    issues?: { total?: number; accepted?: number; pending?: number; rejected?: number; archived?: number };
    opinions?: { total?: number; accepted?: number; pending?: number; rejected?: number; archived?: number };
  };
  verdict?: {
    status?: number | string;
    result?: string;
    label?: string;
    theme?: string;
    icon?: string;
  };
  verdicts?: {
    factual?: { status?: string; decisionMode?: string; evidenceRefs?: string[] };
    ethical?: { status?: string; decisionMode?: string; evidenceRefs?: string[] };
  };
  provenance?: {
    sourceQuality?: { total?: number };
  };
  roles?: {
    admin?: string;
    account?: string;
    screener?: boolean;
    reviewer?: boolean;
  };
  preferences?: {
    privateProfile?: boolean;
  };
  userId?: string | LegacyEntity;
  members?: LegacyEntity[];
  posts?: LegacyEntity[];
  pages?: LegacyEntity[];
  topics?: LegacyEntity[];
  arguments?: LegacyEntity[];
  questions?: LegacyEntity[];
  answers?: LegacyEntity[];
  issues?: LegacyEntity[];
  opinions?: LegacyEntity[];
  artifacts?: LegacyEntity[];
  [key: string]: unknown;
}

export interface LegacyResponse extends Record<string, unknown> {
  topic?: LegacyEntity;
  argument?: LegacyEntity;
  question?: LegacyEntity;
  answer?: LegacyEntity;
  issue?: LegacyEntity;
  opinion?: LegacyEntity;
  artifact?: LegacyEntity;
  group?: LegacyEntity;
  user?: LegacyEntity;
  member?: LegacyEntity;
  topics?: LegacyEntity[];
  arguments?: LegacyEntity[];
  questions?: LegacyEntity[];
  answers?: LegacyEntity[];
  issues?: LegacyEntity[];
  opinions?: LegacyEntity[];
  artifacts?: LegacyEntity[];
  groups?: LegacyEntity[];
  members?: LegacyEntity[];
  contributors?: LegacyEntity[];
  screeners?: LegacyEntity[];
  reviewers?: LegacyEntity[];
  administrators?: LegacyEntity[];
  pages?: LegacyEntity[];
  publicGroups?: LegacyEntity[];
  privateGroups?: LegacyEntity[];
}
