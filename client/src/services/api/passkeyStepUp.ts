import type { ApiRequestError } from './apiError';

let stepUpInFlight: Promise<void> | null = null;

export function isPasskeyStepUpError(error: ApiRequestError): boolean {
  return error.status === 428 && error.code === 'PASSKEY_STEP_UP_REQUIRED';
}

export async function performAutomaticPasskeyStepUp(): Promise<void> {
  if (!stepUpInFlight) {
    stepUpInFlight = import('./passkeys')
      .then(({ passkeyApi }) => passkeyApi.authenticate('step_up'))
      .then(() => undefined)
      .finally(() => {
        stepUpInFlight = null;
      });
  }
  return stepUpInFlight;
}
