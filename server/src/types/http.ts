import type { NextFunction, Request, Response } from 'express';
import type { Session, SessionData } from 'express-session';
import type { AuthUser } from './auth';
import type { ApiErrorCode } from './errors';
import type { CivicTenantDefinition } from './civicTenancy';
import type { ApiClientIdentity } from '../services/apiClientService';
import type { AuthenticationAssurance } from '../services/authAssuranceService';

export interface WikitruthSessionData extends SessionData {
  returnUrl?: string;
  preferences?: Record<string, unknown>;
  diaryCategories?: unknown[];
  myGroups?: unknown[];
  authentication?: AuthenticationAssurance;
  pendingRememberMe?: boolean;
  webSession?: {
    registryId: string;
    sessionKeyHash: string;
    remembered: boolean;
    absoluteExpiresAt: string;
  };
}

export type WikitruthSession = Session & Partial<WikitruthSessionData>;

export interface WikitruthRequest extends Request {
  user?: AuthUser;
  session: WikitruthSession;
  requestId?: string;
  civicTenant?: CivicTenantDefinition;
  apiClient?: ApiClientIdentity;
  agentRun?: {
    runId: string;
    model: string;
    provider: string;
    purpose: string;
    sourceManifest: Array<Record<string, string>>;
  };
  clientTelemetry?: {
    platform: string | null;
    version: string | null;
    build: string | null;
  };
  files?: Record<string, {
    filepath?: string;
    path?: string;
    originalFilename?: string;
    name?: string;
    mimetype?: string;
    type?: string;
    size?: number;
    mtime?: Date;
    lastModifiedDate?: Date;
  }>;
}

export type WikitruthResponse = Response;
export type WikitruthNext = NextFunction;

export interface ApiErrorEnvelope {
  code: ApiErrorCode | string;
  message: string;
  details?: unknown;
  requestId: string | null;
}

export interface ApiErrorResponse {
  error: ApiErrorEnvelope;
}

export interface ApiSuccessResponse<T> {
  data: T;
}
