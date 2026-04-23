'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse, WikitruthNext } from '../types/http';
import * as path from 'path';
const reactShellPath = path.join(process.cwd(), 'public/react-app.html');

module.exports = function (router: Router) {
  // Serve the React app
  router.get('/', function (req: WikitruthRequest, res: WikitruthResponse) {
    res.sendFile(reactShellPath);
  });
  
  // Catch-all route for React Router (client-side routing)
  router.get('/*', function (req: WikitruthRequest, res: WikitruthResponse) {
    res.sendFile(reactShellPath);
  });
};
