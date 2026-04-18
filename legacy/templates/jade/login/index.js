'use strict';

const async = require('async');

/*var   url         = require('url'),
        querystring = require('querystring');*/

const getReturnUrl = function (req) {
  let returnUrl = req.user.defaultReturnUrl();
  if (req.session.returnUrl) {
    returnUrl = req.session.returnUrl;
    delete req.session.returnUrl;
  }
  return returnUrl;
};

const oauthViewModel = function (req, oauthMessage) {
  return {
    oauthMessage: oauthMessage || '',
    oauthTwitter: !!req.app.config.oauth.twitter.key,
    oauthGitHub: !!req.app.config.oauth.github.key,
    oauthFacebook: !!req.app.config.oauth.facebook.key,
    oauthGoogle: !!req.app.config.oauth.google.key,
    oauthApple: !!req.app.config.oauth.apple.key,
    oauthMicrosoft: !!req.app.config.oauth.microsoft.key,
    oauthTumblr: !!req.app.config.oauth.tumblr.key
  };
};

exports.init = function(req, res){
  if (req.isAuthenticated()) {
    res.redirect(getReturnUrl(req));
  }
  else {
    if(!req.session.returnUrl){
      req.session.returnUrl = req.header('Referer');
    }
    res.render('jade/login/index.jade', oauthViewModel(req, ''));
  }
};

exports.login = function(req, res){
  const db = req.app.db.models;
  const workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.body.username) {
      workflow.outcome.errfor.username = 'required';
    }
    if (!req.body.password) {
      workflow.outcome.errfor.password = 'required';
    }
    if (workflow.hasErrors()) {
      return workflow.emit('response');
    }
    workflow.emit('abuseFilter');
  });

  workflow.on('abuseFilter', async function () {
    const getIpCount = async function () {
      const conditions = {ip: req.ip};
      return db.LoginAttempt.countDocuments(conditions);
    };

    const getIpUserCount = async function () {
      const conditions = {ip: req.ip, user: req.body.username};
      return db.LoginAttempt.countDocuments(conditions);
    };

    const results = await async.parallel({ip: getIpCount, ipUser: getIpUserCount});
    if (results.ip >= req.app.config.loginAttempts.forIp || results.ipUser >= req.app.config.loginAttempts.forIpAndUser) {
      workflow.outcome.errors.push('You\'ve reached the maximum number of login attempts. Please try again later.');
      return workflow.emit('response');
    } else {
      workflow.emit('attemptLogin');
    }
  });

  workflow.on('attemptLogin', function() {
    req._passport.instance.authenticate('local', async function(err, user, info) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (!user) {
        const fieldsToSet = { ip: req.ip, user: req.body.username };
        await db.LoginAttempt.create(fieldsToSet);
        workflow.outcome.errors.push('Username and password combination not found or your account is inactive.');
        return workflow.emit('response');
      } else {
        req.login(user, function(err) {
          if (err) {
            console.log(err);
            return workflow.emit('exception', err);
          }
          workflow.emit('response');
        });
      }
    })(req, res);
  });

  workflow.emit('validate');
};

exports.loginTwitter = function(req, res, next){
  const db = req.app.db.models;

  req._passport.instance.authenticate('twitter', async function(err, user, info) {
    if (!info || !info.profile) {
      return res.redirect('/login/');
    }

    const dbUser = await db.User.findOne({ 'twitter.id': info.profile.id });
    if (!dbUser) {
      res.render('jade/login/index.jade', oauthViewModel(req, 'No users found linked to your Twitter account. You may need to create an account first.'));
    } else {
      req.login(dbUser, function(err) {
        if (err) {
          return next(err);
        }
        res.redirect(getReturnUrl(req));
      });
    }
  })(req, res, next);
};

exports.loginGitHub = function(req, res, next){
  const db = req.app.db.models;

  req._passport.instance.authenticate('github', async function(err, user, info) {
    if (!info || !info.profile) {
      return res.redirect('/login/');
    }

    const dbUser = await db.User.findOne({ 'github.id': info.profile.id });
    if (!dbUser) {
      res.render('jade/login/index.jade', oauthViewModel(req, 'No users found linked to your GitHub account. You may need to create an account first.'));
    } else {
      req.login(dbUser, function(err) {
        if (err) {
          return next(err);
        }
        res.redirect(getReturnUrl(req));
      });
    }
  })(req, res, next);
};

exports.loginFacebook = function(req, res, next){
  const db = req.app.db.models;

  req._passport.instance.authenticate('facebook', { callbackURL: '/login/facebook/callback/' }, async function(err, user, info) {
    if (!info || !info.profile) {
      return res.redirect('/login/');
    }

    const dbUser = await db.User.findOne({ 'facebook.id': info.profile.id });
    if (!dbUser) {
      res.render('jade/login/index.jade', oauthViewModel(req, 'No users found linked to your Facebook account. You may need to create an account first.'));

      /*var nextUrl = url.parse(req.originalUrl);
      nextUrl.pathname = '/signup/facebook/callback';
      nextUrl.query = querystring.parse(nextUrl.query);
      res.redirect(url.format(nextUrl));*/
    } else {
      req.login(dbUser, function(err) {
        if (err) {
          return next(err);
        }
        res.redirect(getReturnUrl(req));
      });
    }
  })(req, res, next);
};

exports.loginGoogle = function(req, res, next){
  const models = req.app.db.models;

  req._passport.instance.authenticate('google', { callbackURL: '/login/google/callback/' }, async function(err, user, info) {
    if (!info || !info.profile) {
      return res.redirect('/login/');
    }

    const dbUser = await models.User.findOne({ 'google.id': info.profile.id });
    if (!dbUser) {
      res.render('jade/login/index.jade', oauthViewModel(req, 'No users found linked to your Google account. You may need to create an account first.'));
    } else {
      req.login(dbUser, function(err) {
        if (err) {
          return next(err);
        }

        res.redirect(getReturnUrl(req));
      });
    }
  })(req, res, next);
};

exports.loginApple = function(req, res, next){
  const models = req.app.db.models;

  req._passport.instance.authenticate('apple', { callbackURL: '/login/apple/callback/' }, async function(err, user, info) {
    if (!info || !info.profile) {
      return res.redirect('/login/');
    }

    const dbUser = await models.User.findOne({ 'apple.id': info.profile.id });
    if (!dbUser) {
      res.render('jade/login/index.jade', oauthViewModel(req, 'No users found linked to your Apple account. You may need to create an account first.'));
    } else {
      req.login(dbUser, function(err) {
        if (err) {
          return next(err);
        }

        res.redirect(getReturnUrl(req));
      });
    }
  })(req, res, next);
};

exports.loginMicrosoft = function(req, res, next){
  const models = req.app.db.models;

  req._passport.instance.authenticate('microsoft', { callbackURL: '/login/microsoft/callback/' }, async function(err, user, info) {
    if (!info || !info.profile) {
      return res.redirect('/login/');
    }

    const dbUser = await models.User.findOne({ 'microsoft.id': info.profile.id });
    if (!dbUser) {
      res.render('jade/login/index.jade', oauthViewModel(req, 'No users found linked to your Microsoft account. You may need to create an account first.'));
    } else {
      req.login(dbUser, function(err) {
        if (err) {
          return next(err);
        }
        res.redirect(getReturnUrl(req));
      });
    }
  })(req, res, next);
};

exports.loginTumblr = function(req, res, next){
  const models = req.app.db.models;

  req._passport.instance.authenticate('tumblr', { callbackURL: '/login/tumblr/callback/' }, async function(err, user, info) {
    if (!info || !info.profile) {
      return res.redirect('/login/');
    }
    if (!info.profile.hasOwnProperty('id')) {
      info.profile.id = info.profile.username;
    }

    const dbUser = await models.User.findOne({ 'tumblr.id': info.profile.id });
    if (!dbUser) {
      res.render('jade/login/index.jade', oauthViewModel(req, 'No users found linked to your Tumblr account. You may need to create an account first.'));
    } else {
      req.login(dbUser, function(err) {
        if (err) {
          return next(err);
        }
        res.redirect(getReturnUrl(req));
      });
    }
  })(req, res, next);
};
