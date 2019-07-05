'use strict';

var jwt             = require('jsonwebtoken'),
    cookieParser    = require('cookie-parser');

module.exports = function (router) {

    router.post('/fast-switch', function (req, res) {
        let cookieString = req.body.cookie;
        let pin = req.body.pin;
        let success = false;
        if(cookieString && pin && pin.length == 6) {
            let secret = pin + '|' + req.app.config.jwtSecret;
            let cookies = cookieParser.JSONCookie(cookieString);
            if(cookies.length > 0) {
                for (let cookie of cookies) {
                    jwt.verify(cookie.data, secret, function (err, decoded) {
                        if (!err && decoded && decoded.userId) {
                            // pin matched, auto-login the user
                            // decoded.userId
                            // cookie.id -- client_id
                            success = true;
                            return res.send({});
                        }
                    });
                }
            }
        }
        if(!success) {
            res.status(404).send('Not cookies or session found.');
        }
    });
};
