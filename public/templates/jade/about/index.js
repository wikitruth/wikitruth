'use strict';

var db = require('../../../../app').db.models;

exports.init = function(req, res){
  var model = {};
  db.Page.findOne({ id: 'about' }, function(err, result) {
    model.page = result ? result : {};
    res.render('jade/about/index.jade', model);
  });
};
