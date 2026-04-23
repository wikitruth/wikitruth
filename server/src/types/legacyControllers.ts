import type { Router } from 'express';

export type LegacyControllerFactory = (router: Router) => void;
