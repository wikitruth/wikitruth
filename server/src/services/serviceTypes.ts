import type { Request } from 'express';
import type { EntryBase } from '../types/domain';

export type ServiceQuery = Record<string, unknown>;
export type ServiceSort = Record<string, 1 | -1>;

export interface ServiceListOptions {
  limit?: number;
  sort?: ServiceSort;
  req?: Request;
}

export type ServiceEntry = EntryBase;

export interface FlowUtilsContract {
  setEntryParents(items: ServiceEntry[], typeId: number): Promise<void>;
  setEditorsUsername(items: ServiceEntry[]): Promise<void>;
  appendEntryExtras(item: ServiceEntry, objectType: number, req?: Request): void;
  setVerdictModel?: (item: ServiceEntry) => void;
  setUsername(item: ServiceEntry): Promise<void>;
  setEntryParent(item: ServiceEntry, typeId: number): Promise<void>;
}

export interface LeanFindChain<TEntry> {
  sort(sort: ServiceSort): LeanLimitChain<TEntry>;
}

export interface LeanLimitChain<TEntry> {
  limit(limit: number): {
    lean(): Promise<TEntry[]>;
  };
}

export interface LeanModel<TEntry> {
  find(query: ServiceQuery): LeanFindChain<TEntry>;
  findById(id: string): {
    lean(): Promise<TEntry | null>;
  };
}

export interface IssuesServiceContract {
  getIssuesList(query: ServiceQuery, options?: ServiceListOptions): Promise<ServiceEntry[]>;
  getIssueEntry(issueId: string, req: Request | undefined): Promise<ServiceEntry | null>;
}

export interface OpinionsServiceContract {
  getOpinionsList(query: ServiceQuery, options?: ServiceListOptions): Promise<ServiceEntry[]>;
  getOpinionEntry(opinionId: string, req: Request | undefined): Promise<ServiceEntry | null>;
}

export interface ArtifactsServiceContract {
  getArtifactsList(query: ServiceQuery, options?: ServiceListOptions): Promise<ServiceEntry[]>;
  getArtifactEntry(artifactId: string, req: Request | undefined): Promise<ServiceEntry | null>;
}
