'use strict';

var jwt         = require('jsonwebtoken');

module.exports = function (router) {

    router.post('/fast-switch', function (req, res) {
        let cookies = req.body.cookie || [];
        let pin = req.body.pin;
        if(cookies.length > 0 && pin && pin.length == 6) {
            let secret = pin + '|' + req.app.config.jwtSecret;
            for (let cookie of cookies) {
                jwt.verify(cookie.data, secret, function (err, decoded) {
                    if (!err && decoded && decoded.userId) {
                        // pin matched, auto-login the user
                        // decoded.userId
                        // cookie.id -- client_id
                        return res.send({});
                    }
                });
            }
        }
        res.status(404).send('Not cookies or session not found.');
    });
};
