'use strict';

import type { WikitruthRequest } from '../types/http';
import { getEmailAuthConfig } from './emailAuthService';
import { getWebAuthnConfig, isCanonicalAuthOrigin } from './webAuthnConfigService';

export function buildEmailCodeRuntimeConfig(req: WikitruthRequest) {
  const config = getEmailAuthConfig(req);
  const webAuthn = getWebAuthnConfig(req);
  return {
    enabled: config.enabled,
    codeLength: 6,
    expiresInSeconds: config.codeTtlSeconds,
    resendDelaySeconds: config.resendDelaySeconds,
    canonicalOrigin: webAuthn.canonicalOrigin,
    isCanonicalOrigin: isCanonicalAuthOrigin(req),
  };
}

export function buildPasskeyRuntimeConfig(req: WikitruthRequest) {
  const config = getWebAuthnConfig(req);
  return {
    enabled: config.enabled,
    rpName: config.rpName,
    canonicalOrigin: config.canonicalOrigin,
    isCanonicalOrigin: isCanonicalAuthOrigin(req),
    passwordlessEnabled: config.passwordlessEnabled,
    adminStepUpRequired: config.adminStepUpRequired,
    stepUpMaxAgeSeconds: config.stepUpMaxAgeSeconds,
  };
}

export function buildAuthRuntimeConfig(
  req: WikitruthRequest,
  providers: Record<string, boolean>,
  fastSwitchAvailable: boolean
) {
  return {
    providers,
    emailCode: buildEmailCodeRuntimeConfig(req),
    passkeys: buildPasskeyRuntimeConfig(req),
    fastSwitchAvailable,
  };
}
