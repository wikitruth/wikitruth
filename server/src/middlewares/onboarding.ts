'use strict';

import type { WikitruthNext, WikitruthRequest, WikitruthResponse } from '../types/http';
import { isOnboardingComplete } from '../controllers/api/authHelpers';

export function requireContributorOnboarding(
  req: WikitruthRequest,
  res: WikitruthResponse,
  next: WikitruthNext,
): void {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || !req.user) {
    next();
    return;
  }
  if (!isOnboardingComplete(req.user, 'contributor')) {
    res.status(403).json({
      success: false,
      code: 'ONBOARDING_REQUIRED',
      message: 'Complete Contributor Foundations before creating or editing entries',
      onboardingUrl: '/account/onboarding',
    });
    return;
  }
  next();
}
