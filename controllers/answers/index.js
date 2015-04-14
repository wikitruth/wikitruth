'use strict';


var AnswersModel = require('../../models/answers');


module.exports = function (router) {
    var model = new AnswersModel();

    router.get('/', function (req, res) {
        res.render('answers/index', model);
    });
};
