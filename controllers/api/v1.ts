'use strict';

// Reuse the existing API router tree for /api/v1/* during migration.
// This preserves backward compatibility for /api/* while enabling explicit versioned clients.
module.exports = function (router) {
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install...
  require('./index')(router);
};
