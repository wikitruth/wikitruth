'use strict';

var utils = require('../../utils/utils'),
    flowUtils = require('../../utils/flowUtils'),
    mongoose = require('mongoose'),
    constants = require('../../models/constants'),
    db = require('../../app').db.models;

module.exports = function (router) {

    router.get('/:id', function (req, res) {
        var model = {};
        db.Page.findOne({id: req.params.id}, function(err, result) {
            model.page = result;
            res.render('dust/about/page', model);
        });
    });
};
