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

    router.get('/verses', function (req, res) {
        res.render('dust/wiki/verses', model);
    });
};
