'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const { mountLegacyCompatibility } = require('./mount');
const LEGACY_SERVER_ROOT = path.join(process.cwd(), 'legacy', 'server');

function toBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function normalizeMountPath(input) {
  const candidate = String(input || '/legacy').trim() || '/legacy';
  if (!candidate.startsWith('/')) {
    return '/' + candidate.replace(/\/+$/, '');
  }
  return candidate.replace(/\/+$/, '') || '/legacy';
}

function attachController(legacyRouter, mountPath, controllerPath) {
  const router = express.Router();
  const controller = require(path.join(LEGACY_SERVER_ROOT, 'controllers', controllerPath));
  controller(router);
  legacyRouter.use(mountPath, router);
}

function registerLegacyCompatibility(app, options) {
  const provided = options || {};
  const enabled = toBoolean(
    provided.enabled !== undefined ? provided.enabled : process.env.LEGACY_COMPATIBILITY_ENABLED,
    true,
  );
  const mountPath = normalizeMountPath(provided.mountPath || process.env.LEGACY_COMPATIBILITY_MOUNT_PATH || '/legacy');

  const staticRuntime = mountLegacyCompatibility(app, {
    enabled: enabled,
    staticRoot: provided.staticRoot,
    templatesRoot: provided.templatesRoot,
  });

  if (staticRuntime.templatesRoot && fs.existsSync(staticRuntime.templatesRoot)) {
    app.set('views', staticRuntime.templatesRoot);
  }

  if (!enabled) {
    const disabledStatus = {
      enabled: false,
      mounted: false,
      mountPath: mountPath,
      staticRoot: staticRuntime.staticRoot,
      templatesRoot: staticRuntime.templatesRoot,
    };
    console.log(
      `[compat] enabled=${disabledStatus.enabled} mounted=${disabledStatus.mounted} mountPath=${disabledStatus.mountPath} staticRoot=${disabledStatus.staticRoot} templatesRoot=${disabledStatus.templatesRoot}`,
    );
    return disabledStatus;
  }

  const legacyApp = require(path.join(LEGACY_SERVER_ROOT, 'app'));
  if (legacyApp && !legacyApp.db && app.db) {
    legacyApp.db = app.db;
  }
  if (legacyApp && !legacyApp.config && app.config) {
    legacyApp.config = app.config;
  }

  const legacyRouter = express.Router();

  [
    ['/', 'index'],
    ['/about', 'about'],
    ['/search', 'search'],
    ['/explore', 'explore'],
    ['/screening', 'screening'],
    ['/convert', 'convert'],
    ['/visualize', 'visualize'],
    ['/topics', 'topics'],
    ['/arguments', 'arguments'],
    ['/questions', 'questions'],
    ['/answers', 'answers'],
    ['/issues', 'issues'],
    ['/opinions', 'opinions'],
    ['/artifacts', 'artifacts'],
    ['/groups', 'groups'],
    ['/members', 'members'],
    ['/outline', 'outline'],
    ['/verdict', 'verdict'],
    ['/admin', 'admin'],
    ['/install', 'install'],
    ['/clipboard', 'clipboard'],
    ['/async/app', 'async/app'],
    ['/async/entry', 'async/entry'],
    ['/async/preferences', 'async/preferences'],
    ['/async/clipboard', 'async/clipboard'],
  ].forEach(([routePath, controllerPath]) => {
    attachController(legacyRouter, routePath, controllerPath);
  });

  app.use(mountPath, legacyRouter);
  app.get(mountPath, function (_req, res) {
    res.redirect(mountPath + '/');
  });

  const runtime = {
    enabled: true,
    mounted: true,
    mountPath: mountPath,
    staticRoot: staticRuntime.staticRoot,
    templatesRoot: staticRuntime.templatesRoot,
  };
  console.log(
    `[compat] enabled=${runtime.enabled} mounted=${runtime.mounted} mountPath=${runtime.mountPath} staticRoot=${runtime.staticRoot} templatesRoot=${runtime.templatesRoot}`,
  );
  return runtime;
}

module.exports = registerLegacyCompatibility;
