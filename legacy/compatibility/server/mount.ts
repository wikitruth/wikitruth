'use strict';

import fs from 'fs';
import path from 'path';
import serveStatic from 'serve-static';
import type { Express } from 'express';

import { resolveCompatibilityPath } from './pathResolver';

type LegacyCompatibilityConfig = {
  enabled: boolean;
  staticRoot: string;
  templatesRoot: string;
};

type LegacyCompatibilityOptions = {
  enabled?: boolean;
  staticRoot?: string;
  templatesRoot?: string;
};

type LegacyCompatibilityRuntime = LegacyCompatibilityConfig & {
  mounted: boolean;
};

function resolveCompatibilityConfig(options: LegacyCompatibilityOptions = {}): LegacyCompatibilityConfig {
  const enabled = options.enabled !== false;
  const staticRoot = path.resolve(options.staticRoot || resolveCompatibilityPath('static'));
  const templatesRoot = path.resolve(options.templatesRoot || resolveCompatibilityPath('templates'));
  return {
    enabled,
    staticRoot,
    templatesRoot,
  };
}

function mountLegacyCompatibility(app: Express, options: LegacyCompatibilityOptions = {}): LegacyCompatibilityRuntime {
  const config = resolveCompatibilityConfig(options);
  if (!config.enabled) {
    console.log('[compat] Legacy compatibility disabled (modern-only mode).');
    return { ...config, mounted: false };
  }

  if (!fs.existsSync(config.staticRoot)) {
    console.warn('[compat] Static root not found: ' + config.staticRoot);
    return { ...config, mounted: false };
  }

  // Preserve legacy URL contracts (/css, /js, /layouts, /views, /components, etc.)
  app.use(serveStatic(config.staticRoot));
  console.log('[compat] Mounted static root: ' + config.staticRoot);
  return { ...config, mounted: true };
}

export { mountLegacyCompatibility };
export type { LegacyCompatibilityOptions, LegacyCompatibilityRuntime };
