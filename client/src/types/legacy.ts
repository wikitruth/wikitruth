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
  editorUsername: string;
  username: string;
  email: string;
  createUserId: string;
  roleType: number;
  file: {
    type: string;
    name: string;
  };
  parentTopic?: LegacyEntity;
  childrenCount?: {
    topics?: { accepted?: number };
    arguments?: { accepted?: number };
    questions?: { accepted?: number };
  };
  verdict?: {
    result?: string;
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
