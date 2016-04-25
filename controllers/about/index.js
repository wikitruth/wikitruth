'use strict';

var templates   = require('../../models/templates'),
    db          = require('../../app').db.models;

module.exports = function (router) {

    router.get('/:id', function (req, res) {
        var model = {};
        db.Page.findOne({id: req.params.id}, function(err, result) {
            model.page = result;
            res.render(templates.about.index, model);
        });
    });
};
