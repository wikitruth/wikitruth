'use strict';

var paths       = require('../../models/paths'),
    templates   = require('../../models/templates');

module.exports = function (router) {
    var model = {};

    router.get('/', function (req, res) {
        res.render(templates.answers.index, model);
    });
};
