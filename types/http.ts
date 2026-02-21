import type { NextFunction, Request, Response } from 'express';
import type { Session, SessionData } from 'express-session';
import type { AuthUser } from './auth';

export interface WikitruthSessionData extends SessionData {
  returnUrl?: string;
}

export type WikitruthSession = Session & Partial<WikitruthSessionData>;

export interface WikitruthRequest extends Request {
  user?: AuthUser;
  session: WikitruthSession;
  requestId?: string;
}

export type WikitruthResponse = Response;
export type WikitruthNext = NextFunction;
