'use strict';

var db = require('../../../../../app').db.models;

exports.init = async function(req, res){
  var model = {};
  try {
    var result = await db.Page.findOne({ id: 'about' }).lean();
    model.page = result ? result : {};
  } catch (_err) {
    model.page = {};
  }
  res.render('jade/about/index.jade', model);
};
