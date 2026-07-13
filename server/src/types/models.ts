import type { ApplicationDefinition, EntryBase } from './domain';

export interface QueryChain<TDoc> {
  sort(sort: Record<string, 1 | -1>): QueryChain<TDoc>;
  limit(limit: number): QueryChain<TDoc>;
  skip(skip: number): QueryChain<TDoc>;
  lean(): Promise<TDoc[]>;
  exec(): Promise<TDoc[]>;
}

export interface FindByIdChain<TDoc> {
  lean(): Promise<TDoc | null>;
  exec(): Promise<TDoc | null>;
}

export interface ModelLike<TDoc = EntryBase> {
  find(query: Record<string, unknown>): QueryChain<TDoc>;
  findById(id: string): FindByIdChain<TDoc>;
  findOne?(query: Record<string, unknown>): {
    lean(): Promise<TDoc | null>;
    exec(): Promise<TDoc | null>;
  };
}

export interface CoreModelsRegistry {
  Topic: ModelLike<EntryBase>;
  Argument: ModelLike<EntryBase>;
  Question: ModelLike<EntryBase>;
  Answer: ModelLike<EntryBase>;
  Issue: ModelLike<EntryBase>;
  Opinion: ModelLike<EntryBase>;
  Artifact: ModelLike<EntryBase>;
  CivicRecord?: ModelLike<EntryBase>;
  Group?: ModelLike<EntryBase>;
  User?: ModelLike<EntryBase>;
  [key: string]: ModelLike<EntryBase> | undefined;
}

export interface AppContext {
  db: {
    models: CoreModelsRegistry;
  };
  config?: {
    projectName?: string;
    requireAccountVerification?: boolean;
    oauth?: Record<string, { key?: string; secret?: string }>;
  };
  locals?: {
    appCategories?: unknown[];
  };
}

export interface ApplicationsModule {
  getApplications(): ApplicationDefinition[];
  getApplication(req: { hostname?: string }): ApplicationDefinition | null;
  getApplicationAsync?(req: { hostname?: string; get?: (name: string) => string | undefined }): Promise<ApplicationDefinition | null>;
}
