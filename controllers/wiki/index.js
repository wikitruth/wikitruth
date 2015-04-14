'use strict';


var WikiModel = require('../../models/wiki');

module.exports = function (router) {
    var model = new WikiModel();

    router.get('/', function (req, res) {
        res.render('wiki/index', model);
        //res.send('<code><pre>' + JSON.stringify(model, null, 2) + '</pre></code>');
    });
};
