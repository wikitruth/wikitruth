import { apiErrorFromResponse } from './apiError';
import { isPasskeyStepUpError, performAutomaticPasskeyStepUp } from './passkeyStepUp';

export async function fetchWithPasskeyStepUp(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  let retriedAfterStepUp = false;
  while (true) {
    const response = await fetch(input, init);
    if (response.ok) return response;

    const error = await apiErrorFromResponse(response);
    if (!retriedAfterStepUp && isPasskeyStepUpError(error)) {
      retriedAfterStepUp = true;
      await performAutomaticPasskeyStepUp();
      continue;
    }
    throw error;
  }
}

export default fetchWithPasskeyStepUp;
