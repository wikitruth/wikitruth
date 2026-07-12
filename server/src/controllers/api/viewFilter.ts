'use strict';

import type { WikitruthRequest } from '../../types/http';
import constantsMod from '../../models/constants';

const constants = constantsMod as unknown as {
  SCREENING_STATUS: {
    status0: { code: number };
    status1: { code: number };
    status3: { code: number };
  };
};

type QueryWithScreening = Record<string, unknown> & {
  'screening.status'?: unknown;
};

export type ApiViewMode = 'default' | 'all' | 'wiki' | 'original' | 'archived';

export function applyViewModeFilter(
  req: WikitruthRequest | any,
  query: QueryWithScreening,
  defaultStatus?: unknown,
): ApiViewMode {
  const viewMode = String(req?.query?.view || '').trim().toLowerCase();

  if (viewMode === 'all') {
    delete query['screening.status'];
    return 'all';
  }

  if (viewMode === 'original') {
    query['screening.status'] = constants.SCREENING_STATUS.status0.code;
    return 'original';
  }

  if (viewMode === 'wiki') {
    query['screening.status'] = constants.SCREENING_STATUS.status1.code;
    return 'wiki';
  }

  if (viewMode === 'archived') {
    query['screening.status'] = constants.SCREENING_STATUS.status3.code;
    return 'archived';
  }

  if (typeof defaultStatus !== 'undefined') {
    query['screening.status'] = defaultStatus;
  }
  return 'default';
}
