'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'path'.
const path = require('path');

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {
  // Serve the React app
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/', function (req, res) {
    // @ts-ignore TS(2304): Cannot find name '__dirname'.
    res.sendFile(path.join(__dirname, '../public/react-app.html'));
  });
  
  // Catch-all route for React Router (client-side routing)
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/*', function (req, res) {
    // @ts-ignore TS(2304): Cannot find name '__dirname'.
    res.sendFile(path.join(__dirname, '../public/react-app.html'));
  });
};
