'use strict';

function setupPreferences(req) {
    var preferences = req.session.preferences;
    if(!preferences) {
        preferences = {};
    }
    return preferences;
}

module.exports = function (router) {

    router.post('/update', function (req, res) {
        var fullscreen = req.body.fullscreen;

        var preferences = setupPreferences(req);
        preferences.fullscreen = !!fullscreen;

        req.session.preferences = preferences;
        res.send({});
    });

    router.post('/reset', function (req, res) {
        delete req.session.preferences;
        res.send({});
    });

    router.get('/read', function (req, res) {
        res.send(req.session.preferences);
    });
};
