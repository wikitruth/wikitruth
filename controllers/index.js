'use strict';

var templates   = require('../models/templates');

module.exports = function (router) {
    var model = {};

    router.get('/', function (req, res) {
        res.render(templates.index, model);
    });
};
