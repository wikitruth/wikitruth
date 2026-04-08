'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'path'.
const path = require('path');
const reactShellPath = path.join(process.cwd(), 'public/react-app.html');

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {
  // Serve the React app
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/', function (req, res) {
    res.sendFile(reactShellPath);
  });
  
  // Catch-all route for React Router (client-side routing)
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/*', function (req, res) {
    res.sendFile(reactShellPath);
  });
};
