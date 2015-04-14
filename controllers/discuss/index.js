'use strict';


var DiscussModel = require('../../models/discuss');


module.exports = function (router) {
    var model = new DiscussModel();

    router.get('/', function (req, res) {
        res.render('discuss/index', model);
    });
};
