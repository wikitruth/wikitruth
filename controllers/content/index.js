'use strict';

var utils = require('../../utils/utils'),
    wikiUtils = require('../../utils/wikiUtils'),
    mongoose = require('mongoose'),
    constants = require('../../models/constants'),
    db = require('../../app').db.models;

module.exports = function (router) {
    var model = {};
    router.get('/edit', function (req, res) {
        res.render('dust/page/edit', model);
    });
};
