'use strict';

var paths       = require('../../models/paths'),
    templates   = require('../../models/templates');

module.exports = function (router) {
    var model = {};

    router.get('/', function (req, res) {
        res.render(templates.discuss.index, model);
    });

    router.get('/category/', function (req, res) {
        res.render(templates.discuss.category, model);
    });

    router.get('/category/topic/', function (req, res) {
        res.render(templates.discuss.topic, model);
    });
};
