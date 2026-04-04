'use strict';

const app = require('./app');
const config = require('./config/config');
const fs = require('fs');
const http = require('http');
const https = require('https');

function getRedirectHost(req) {
  const forwardedHostHeader = req.headers['x-forwarded-host'];
  const candidateHost = Array.isArray(forwardedHostHeader)
    ? forwardedHostHeader[0]
    : forwardedHostHeader || req.headers.host || 'localhost';
  const firstHost = String(candidateHost).split(',')[0].trim();

  if (firstHost.startsWith('[')) {
    const closingBracketIndex = firstHost.indexOf(']');
    if (closingBracketIndex !== -1) {
      return firstHost.slice(0, closingBracketIndex + 1);
    }
  }

  const firstColonIndex = firstHost.indexOf(':');
  const lastColonIndex = firstHost.lastIndexOf(':');
  if (firstColonIndex !== -1 && firstColonIndex === lastColonIndex) {
    return firstHost.slice(0, firstColonIndex);
  }

  return firstHost;
}

function buildHttpsLocation(req, httpsPort) {
  const host = getRedirectHost(req);
  const portSegment = httpsPort === 443 ? '' : ':' + httpsPort;
  return 'https://' + host + portSegment + (req.url || '/');
}

/*
 * Create and start HTTP server.
 */
const httpsConfig = config.https || {};
const httpsEnabled = httpsConfig.enabled === true;
const httpsPort = Number(process.env.HTTPS_PORT || httpsConfig.port || 8443) || 8443;
const httpToHttpsRedirectEnabled = httpsEnabled && httpsConfig.redirectHttp === true;

const httpHandler = httpToHttpsRedirectEnabled
  ? function (req, res) {
    res.statusCode = 301;
    res.setHeader('Location', buildHttpsLocation(req, httpsPort));
    res.end();
  }
  : app;

const httpPort = Number(process.env.PORT || config.port || 8000) || 8000;
const httpServer = http.createServer(httpHandler);
httpServer.listen(httpPort);
httpServer.on('listening', function () {
  console.log('Server listening on http://localhost:%d', this.address().port);
  if (httpToHttpsRedirectEnabled) {
    console.log('HTTP to HTTPS redirect is enabled.');
  }
});

if (httpsEnabled) {
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
