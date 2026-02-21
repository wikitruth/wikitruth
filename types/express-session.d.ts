import 'express-session';

declare module 'express-session' {
  interface SessionData {
    returnUrl?: string;
    preferences?: Record<string, unknown>;
    diaryCategories?: unknown[];
    myGroups?: unknown[];
  }
}
