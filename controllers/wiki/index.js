'use strict';

var WikiModel = require('../../models/wiki');

module.exports = function (router) {
    var model = new WikiModel();

    router.get('/', function (req, res) {
        res.render('dust/wiki/index', model);
        //res.send('<code><pre>' + JSON.stringify(model, null, 2) + '</pre></code>');
    });

    router.get('/topic', function (req, res) {
        res.render('dust/wiki/topic', model);
    });

    router.get('/topic/create', function (req, res) {
        res.render('dust/wiki/topic/create', model);
    });

    router.post('/topic/create', function (req, res) {
        var entity = {
            content: req.body.content,
            name: req.body.name
        };

        req.app.db.models.Topic.create(entity, function(err, item) {
            if (err) {
                //return workflow.emit('exception', err);
                throw err;
            }

            res.redirect('/wiki');
        });
    });

    router.get('/verses', function (req, res) {
        res.render('dust/wiki/arguments', model);
    });
};
