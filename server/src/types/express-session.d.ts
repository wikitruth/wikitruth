import 'express-session';
import type { AuthenticationAssurance } from '../services/authAssuranceService';

declare module 'express-session' {
  interface SessionData {
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
}
