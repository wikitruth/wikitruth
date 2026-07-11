import type { RequestContextUser, ApplicationDefinition } from './domain';
import type { WikitruthSessionData } from './http';

declare global {
  namespace Express {
    interface User extends RequestContextUser {}

    interface Request {
      requestId?: string;
      user?: RequestContextUser;
      csrfToken(): string;
      session: import('express-session').Session &
        Partial<WikitruthSessionData> & {
          preferences?: Record<string, unknown>;
          diaryCategories?: unknown[];
          myGroups?: unknown[];
        };
    }

    interface Locals {
      _csrf?: string;
      fastSwitch?: boolean;
      user?: {
        username: string;
        defaultReturnUrl: string;
        isAdmin: boolean;
        roles?: RequestContextUser['roles'];
      };
      isContributor?: string;
      diaryBaseUrl?: string;
      query?: Record<string, unknown>;
      preferences?: Record<string, unknown>;
      application?: ApplicationDefinition | null;
      appCategories?: unknown[];
      diaryCategories?: unknown[];
      myGroups?: unknown[];
      group?: unknown;
      requestId?: string;
      projectName?: string;
      titleSlogan?: string;
      googleAnalyticsTrackingId?: string;
    }
  }
}

export {};
