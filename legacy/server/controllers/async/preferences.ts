'use strict';

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
function setupPreferences(req) {
    var preferences = req.session.preferences;
    if(!preferences) {
        preferences = {};
    }
    return preferences;
}

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {

    // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
    router.post('/update', function (req, res) {
        var fullscreen = req.body.fullscreen;

        var preferences = setupPreferences(req);
        preferences.fullscreen = !!fullscreen;

        req.session.preferences = preferences;
        res.send({});
    });

    // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
    router.post('/reset', function (req, res) {
        delete req.session.preferences;
        res.send({});
    });

    // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
    router.get('/read', function (req, res) {
        res.send(req.session.preferences);
    });
};
