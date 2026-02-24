'use strict';

import type { Router } from 'express';

// Reuse the existing API router tree for /api/v1/* during migration.
// This preserves backward compatibility for /api/* while enabling explicit versioned clients.
module.exports = function (router: Router) {
  const mountApi = require('./index') as (routerArg: Router) => void;
  mountApi(router);
};
