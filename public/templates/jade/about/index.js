'use strict';

var utils = require('../../../../utils/utils'),
    wikiUtils = require('../../../../utils/wikiUtils'),
    mongoose = require('mongoose'),
    constants = require('../../../../models/constants'),
    db = require('../../../../app').db.models;

exports.init = function(req, res){
  var model = {};
  db.Content.findOne({ id: 'about' }, function(err, result) {
    model.content = result;
    res.render('jade/about/index.jade', model);
  });
};
