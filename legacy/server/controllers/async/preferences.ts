'use strict';

import type { LegacyControllerFactory } from '../../../../server/src/types/legacyControllers';

function setupPreferences(req: { session: { preferences?: Record<string, unknown> } }): Record<string, unknown> {
  const preferences = req.session.preferences;
  if (!preferences) {
    return {};
  }
  return preferences;
}

const mountAsyncPreferencesController: LegacyControllerFactory = function (router) {

    router.post('/update', function (req, res) {
        const fullscreen = req.body.fullscreen;

        const preferences = setupPreferences(req);
        preferences.fullscreen = !!fullscreen;

        req.session.preferences = preferences;
        res.send({});
    });

    router.post('/reset', function (req, res) {
        delete req.session.preferences;
        res.send({});
    });

    router.get('/read', function (req, res) {
        res.send(req.session.preferences);
    });
};

export default mountAsyncPreferencesController;
