'use strict';

import type { NextFunction } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../types/http';
import {
  CivicTenantResolutionError,
  resolveCivicTenant,
} from '../services/civicTenantService';

export async function civicTenantContext(
  req: WikitruthRequest,
  res: WikitruthResponse,
  next: NextFunction,
): Promise<void> {
  try {
    req.civicTenant = await resolveCivicTenant(req);
    next();
  } catch (error) {
    if (error instanceof CivicTenantResolutionError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
}
