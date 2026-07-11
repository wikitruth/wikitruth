// Narrow legacy module contracts to type CommonJS imports without `any`.
// Each interface lists known top-level keys with permissive value shapes
// so call sites pass strict mode without losing arbitrary nested access.

type CodedEntry = { code: number; text?: string;[k: string]: unknown };

type ScreeningStatus = {
  status0: CodedEntry;
  status1: CodedEntry;
  status2: CodedEntry;
  status3: CodedEntry;
  [k: string]: CodedEntry;
};

type IssueTypeSet = {
  type10: CodedEntry;
  type20: CodedEntry;
  type30: CodedEntry;
  type40: CodedEntry;
  type45: CodedEntry;
  type50: CodedEntry;
  type60: CodedEntry;
  type70: CodedEntry;
  type100: CodedEntry;
};

type TagTypeSet = {
  tag10: CodedEntry;
  tag20: CodedEntry;
  tag30: CodedEntry;
  tag40: CodedEntry;
  tag50: CodedEntry;
  tag60: CodedEntry;
  tag70: CodedEntry;
  tag80: CodedEntry;
};

type GroupPrivacyTypeSet = {
  type10: CodedEntry;
  type20: CodedEntry;
  type30: CodedEntry;
};

type GroupRoleTypeSet = {
  type10: CodedEntry;
  type20: CodedEntry;
};

type ArgumentTypeSet = {
  [k: string]: CodedEntry | undefined;
};

type ObjectTypes = {
  topic: number;
  topicLink: number;
  argument: number;
  argumentLink: number;
  question: number;
  definition: number;
  artifact: number;
  issue: number;
  opinion: number;
  answer: number;
  user: number;
  group: number;
};

export interface ConstantsModule {
  OBJECT_TYPES: ObjectTypes;
  ARGUMENT_TYPES: ArgumentTypeSet;
  ISSUE_TYPES: IssueTypeSet;
  GROUP_ROLE_TYPES: GroupRoleTypeSet;
  GROUP_PRIVACY_TYPES: GroupPrivacyTypeSet;
  ARGUMENT_TAGS: TagTypeSet;
  TOPIC_TAGS: TagTypeSet;
  ETHICAL_STATUS: { [k: string]: number };
  SCREENING_STATUS: ScreeningStatus;
  VERDICT_STATUS: { [k: string]: unknown };
  SETTINGS: {
    contentPreviewLength: number;
    TILE_MAX_ENTRY_LEN: number;
    TILE_MAX_SUB_ENTRY_LEN: number;
    SUBCATEGORY_LIST_SIZE: number;
  };
  PARENT_RELATIONSHIP: { [k: string]: unknown };
  OBJECT_NAMES_MAP: { [k: number]: string };
  OBJECT_ID_NAME_MAP: { [k: number]: string };
  OBJECT_FORMAL_NAME_MAP: { [k: number]: string };
  LINK_TYPES: { [k: string]: number };
}

// Loose entry shape returned by lean queries / flow helpers.
export type LegacyEntry = Record<string, unknown>;

type LooseFn = (...args: unknown[]) => unknown;

export interface FlowUtilsModule {
  setScreeningModel: LooseFn;
  setScreeningModelCount: LooseFn;
  setEditorsUsername: LooseFn;
  setEntryParents: LooseFn;
  setEntryParent: LooseFn;
  setUsername: LooseFn;
  appendEntryExtras: LooseFn;
  setVerdictModel: LooseFn;
  setTopicModels: LooseFn;
  setEntryModels: LooseFn;
  setModelOwnerEntry: LooseFn;
  setModelContext: LooseFn;
  getTopics: (query: unknown, options?: unknown) => Promise<LegacyEntry[]>;
  getArguments: (query: unknown, options?: unknown) => Promise<LegacyEntry[]>;
  getCategories: (...args: unknown[]) => Promise<LegacyEntry[]>;
  getDiaryCategories: (req: unknown) => Promise<LegacyEntry[]>;
  getUserGroups: (req?: unknown) => Promise<LegacyEntry[]>;
  getVerdictCount: LooseFn;
  getParent: LooseFn;
  getDbModelByObjectType: LooseFn;
  getBackupDir: LooseFn;
  createEntrySet: LooseFn;
  createOwnerQueryFromQuery: LooseFn;
  sortArguments: LooseFn;
  syncChildren: LooseFn;
  updateChildrenCount: LooseFn;
  updateChildrenCountBatch: LooseFn;
  resetCache: LooseFn;
}

export interface UtilsModule {
  urlify: LooseFn;
}

export interface DbModelModule {
  find: LooseFn;
  findOne: LooseFn;
  findById: LooseFn;
  create: LooseFn;
  countDocuments: LooseFn;
  updateOne: LooseFn;
  deleteOne: LooseFn;
  insertMany: LooseFn;
  aggregate: LooseFn;
  [key: string]: LooseFn | undefined;
}

export interface DbModelsModule {
  Account: DbModelModule;
  Admin: DbModelModule;
  AdminGroup: DbModelModule;
  Answer: DbModelModule;
  Appeal: DbModelModule;
  Argument: DbModelModule;
  ArgumentLink: DbModelModule;
  Artifact: DbModelModule;
  Category: DbModelModule;
  Group: DbModelModule;
  Issue: DbModelModule;
  LoginAttempt: DbModelModule;
  Opinion: DbModelModule;
  Page: DbModelModule;
  Question: DbModelModule;
  Reaction: DbModelModule;
  ReaderSignal: DbModelModule;
  Status: DbModelModule;
  Topic: DbModelModule;
  TopicLink: DbModelModule;
  TrustedClient: DbModelModule;
  User: DbModelModule;
  VerdictVote: DbModelModule;
}
