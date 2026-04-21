'use strict';

exports.init = function(req, res){
  req.session.destroy();
  req.logout();
  if (req.baseUrl && String(req.baseUrl).startsWith('/legacy')) {
    return res.redirect('/legacy/');
  }
  res.redirect('/');
};
