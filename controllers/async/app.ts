'use strict';

// @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
const jwt = require('jsonwebtoken'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  cookieParser = require('cookie-parser');

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.post('/fast-switch', async function (req, res) {
    let cookieString = req.body.cookie;
    let pin = req.body.pin;
    let success = false;
    if (cookieString && pin && pin.length === 6) {
      let secret = pin + '|' + req.app.config.jwtSecret;
      let cookies = cookieParser.JSONCookie(cookieString);
      if (cookies.length > 0) {
        for (let cookie of cookies) {
          const decoded = await jwt.verify(cookie.data, secret);
          if (decoded?.userId) {
            // pin matched, auto-login the user
            // decoded.userId
            // cookie.id -- client_id
            success = true;
            return res.send({});
          }
        }
      }
    }
    if (!success) {
      res.status(404).send('Not cookies or session found.');
    }
  });
};
