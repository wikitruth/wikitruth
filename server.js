'use strict';

const app = require('./app');
const config = require('./config/config');
const fs = require('fs');
const http = require('http');
const https = require('https');

/*
 * Create and start HTTP server.
 */
const httpPort = Number(process.env.PORT || config.port || 8000) || 8000;
const httpServer = http.createServer(app);
httpServer.listen(httpPort);
httpServer.on('listening', function () {
  console.log('Server listening on http://localhost:%d', this.address().port);
});

const httpsConfig = config.https || {};
const httpsEnabled = httpsConfig.enabled === true;
if (httpsEnabled) {
  const httpsPort = Number(process.env.HTTPS_PORT || httpsConfig.port || 8443) || 8443;
  const httpsKeyPath = process.env.HTTPS_KEY_PATH || httpsConfig.keyPath;
  const httpsCertPath = process.env.HTTPS_CERT_PATH || httpsConfig.certPath;

  if (!httpsKeyPath || !httpsCertPath) {
    console.error(
      'HTTPS is enabled but certificate paths are missing. Set HTTPS_KEY_PATH and HTTPS_CERT_PATH.'
    );
  } else {
    try {
      const httpsOptions = {
        key: fs.readFileSync(httpsKeyPath),
        cert: fs.readFileSync(httpsCertPath),
      };
      const httpsServer = https.createServer(httpsOptions, app);
      httpsServer.listen(httpsPort);
      httpsServer.on('listening', function () {
        console.log('Server listening on https://localhost:%d', this.address().port);
      });
    } catch (error) {
      console.error('Failed to start HTTPS server:', error.message);
    }
  }
}
