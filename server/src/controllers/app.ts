'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse, WikitruthNext } from '../types/http';
import { renderReactShell, resolveReactShellApplication } from '../services/reactShellService';

function sendShell(req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext): void {
  void resolveReactShellApplication(req, res.locals.application || null)
    .then((application) => renderReactShell(req, application))
    .then((html) => res.type('html').send(html))
    .catch(next);
}

export = function (router: Router) {
  // Serve the React app
  router.get('/', sendShell);
  
  // Catch-all route for React Router (client-side routing)
  router.get('/*', sendShell);
};
