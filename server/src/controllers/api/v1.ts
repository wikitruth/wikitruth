'use strict';

import type { Router } from 'express';
import mountApiMod from './index';

// Reuse the existing API router tree for /api/v1/* during migration.
// This preserves backward compatibility for /api/* while enabling explicit versioned clients.
export = function (router: Router) {
  const mountApi = mountApiMod as unknown as (routerArg: Router) => void;
  mountApi(router);
};
