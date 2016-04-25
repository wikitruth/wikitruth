'use strict';

exports.init = function(req, res, next){
  var sigma = {};
  var collections = ['User', 'Account', 'Admin', 'AdminGroup', 'AccountCategory', 'Status'];
  var queries = [];

  collections.forEach(function(el, i, arr) {
    queries.push(function(done) {
      req.app.db.models[el].count({}, function(err, count) {
        if (err) {
          return done(err, null);
        }

        sigma['count'+ el] = count;
        done(null, el);
      });
    });
  });

  var asyncFinally = function(err, results) {
    if (err) {
      return next(err);
    }

    res.render('jade/admin/index.jade', sigma);
  };

  require('async').parallel(queries, asyncFinally);
};
