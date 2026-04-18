'use strict';

exports.init = function(req, res){
  req.session.destroy();
  req.logout();
  res.redirect('/');
};
