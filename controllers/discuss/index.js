'use strict';


var DiscussModel = require('../../models/discuss');


module.exports = function (router) {
    var model = new DiscussModel();

    router.get('/', function (req, res) {
        res.render('dust/discuss/index', model);
    });

    router.get('/category/', function (req, res) {
        res.render('dust/discuss/category', model);
    });

    router.get('/category/topic/', function (req, res) {
        res.render('dust/discuss/topic', model);
    });
};
