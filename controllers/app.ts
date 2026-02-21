// @ts-nocheck
'use strict';

const path = require('path');

module.exports = function (router) {
  // Serve the React app
  router.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '../public/react-app.html'));
  });
  
  // Catch-all route for React Router (client-side routing)
  router.get('/*', function (req, res) {
    res.sendFile(path.join(__dirname, '../public/react-app.html'));
  });
};
