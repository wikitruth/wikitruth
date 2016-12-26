'use strict';

var tmplRoot = '../public/templates/jade',
    paths     = require('../models/paths');

function _require(code) {
  return require(tmplRoot + code);
}

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.set('X-Auth-Required', 'true');
  req.session.returnUrl = req.originalUrl;
  res.redirect('/login/');
}

function ensureAdmin(req, res, next) {
  if (req.user.canPlayRoleOf('admin')) {
    return next();
  }
  res.redirect('/');
}

function ensureAccount(req, res, next) {
  if (req.user.canPlayRoleOf('account')) {
    if (req.app.config.requireAccountVerification) {
      if (req.user.roles.account.isVerified !== 'yes' && !/^\/account\/verification\//.test(req.url)) {
        return res.redirect('/account/verification/');
      }
    }
    return next();
  }
  res.redirect('/');
}

function ensureAccountOwner(req, res, next) {
  if(req.user.username === req.params.username) {
    return next();
  }
  res.redirect('/');
}

exports = module.exports = function(app, passport) {

  app.get(paths.truth.topics.create, ensureAuthenticated);
  app.get(paths.truth.arguments.create, ensureAuthenticated);
  app.get(paths.truth.questions.create, ensureAuthenticated);
  app.get(paths.truth.issues.create, ensureAuthenticated);
  app.get(paths.truth.opinions.create, ensureAuthenticated);

  // member diary
  app.all('/members/:username/diary*', ensureAuthenticated);
  app.all('/members/:username/diary*', ensureAccountOwner);

  //front end
  app.get('/home/', _require('/index').init);
  app.get('/about/', _require('/about/index').init);
  app.get('/contact/', _require('/contact/index').init);
  app.post('/contact/', _require('/contact/index').sendMessage);

  //sign up
  app.get('/signup/', _require('/signup/index').init);
  app.post('/signup/', _require('/signup/index').signup);

  //social sign up
  app.post('/signup/social/', _require('/signup/index').signupSocial);
  app.get('/signup/twitter/', passport.authenticate('twitter', { callbackURL: '/signup/twitter/callback/' }));
  app.get('/signup/twitter/callback/', _require('/signup/index').signupTwitter);
  app.get('/signup/github/', passport.authenticate('github', { callbackURL: '/signup/github/callback/', scope: ['user:email'] }));
  app.get('/signup/github/callback/', _require('/signup/index').signupGitHub);
  app.get('/signup/facebook/', passport.authenticate('facebook', { callbackURL: '/signup/facebook/callback/', scope: ['email'] }));
  app.get('/signup/facebook/callback/', _require('/signup/index').signupFacebook);
  app.get('/signup/google/', passport.authenticate('google', { callbackURL: '/signup/google/callback/', scope: ['profile email'] }));
  app.get('/signup/google/callback/', _require('/signup/index').signupGoogle);
  app.get('/signup/tumblr/', passport.authenticate('tumblr', { callbackURL: '/signup/tumblr/callback/' }));
  app.get('/signup/tumblr/callback/', _require('/signup/index').signupTumblr);

  //login/out
  app.get('/login/', _require('/login/index').init);
  app.post('/login/', _require('/login/index').login);
  app.get('/login/forgot/', _require('/login/forgot/index').init);
  app.post('/login/forgot/', _require('/login/forgot/index').send);
  app.get('/login/reset/', _require('/login/reset/index').init);
  app.get('/login/reset/:email/:token/', _require('/login/reset/index').init);
  app.put('/login/reset/:email/:token/', _require('/login/reset/index').set);
  app.get('/logout/', _require('/logout/index').init);

  //social login
  app.get('/login/twitter/', passport.authenticate('twitter', { callbackURL: '/login/twitter/callback/' }));
  app.get('/login/twitter/callback/', _require('/login/index').loginTwitter);
  app.get('/login/github/', passport.authenticate('github', { callbackURL: '/login/github/callback/' }));
  app.get('/login/github/callback/', _require('/login/index').loginGitHub);
  app.get('/login/facebook/', passport.authenticate('facebook', { callbackURL: '/login/facebook/callback/' }));
  app.get('/login/facebook/callback/', _require('/login/index').loginFacebook);
  app.get('/login/google/', passport.authenticate('google', { callbackURL: '/login/google/callback/', scope: ['profile email'] }));
  app.get('/login/google/callback/', _require('/login/index').loginGoogle);
  app.get('/login/tumblr/', passport.authenticate('tumblr', { callbackURL: '/login/tumblr/callback/', scope: ['profile email'] }));
  app.get('/login/tumblr/callback/', _require('/login/index').loginTumblr);

  //admin
  app.all('/admin*', ensureAuthenticated);
  app.all('/admin*', ensureAdmin);
  app.get('/admin/', _require('/admin/index').init);

  //admin > users
  app.get('/admin/users/', _require('/admin/users/index').find);
  app.post('/admin/users/', _require('/admin/users/index').create);
  app.get('/admin/users/:id/', _require('/admin/users/index').read);
  app.put('/admin/users/:id/', _require('/admin/users/index').update);
  app.put('/admin/users/:id/password/', _require('/admin/users/index').password);
  app.put('/admin/users/:id/role-admin/', _require('/admin/users/index').linkAdmin);
  app.delete('/admin/users/:id/role-admin/', _require('/admin/users/index').unlinkAdmin);
  app.put('/admin/users/:id/role-account/', _require('/admin/users/index').linkAccount);
  app.delete('/admin/users/:id/role-account/', _require('/admin/users/index').unlinkAccount);
  app.delete('/admin/users/:id/', _require('/admin/users/index').delete);

  //admin > administrators
  app.get('/admin/administrators/', _require('/admin/administrators/index').find);
  app.post('/admin/administrators/', _require('/admin/administrators/index').create);
  app.get('/admin/administrators/:id/', _require('/admin/administrators/index').read);
  app.put('/admin/administrators/:id/', _require('/admin/administrators/index').update);
  app.put('/admin/administrators/:id/permissions/', _require('/admin/administrators/index').permissions);
  app.put('/admin/administrators/:id/groups/', _require('/admin/administrators/index').groups);
  app.put('/admin/administrators/:id/user/', _require('/admin/administrators/index').linkUser);
  app.delete('/admin/administrators/:id/user/', _require('/admin/administrators/index').unlinkUser);
  app.delete('/admin/administrators/:id/', _require('/admin/administrators/index').delete);

  //admin > admin groups
  app.get('/admin/admin-groups/', _require('/admin/admin-groups/index').find);
  app.post('/admin/admin-groups/', _require('/admin/admin-groups/index').create);
  app.get('/admin/admin-groups/:id/', _require('/admin/admin-groups/index').read);
  app.put('/admin/admin-groups/:id/', _require('/admin/admin-groups/index').update);
  app.put('/admin/admin-groups/:id/permissions/', _require('/admin/admin-groups/index').permissions);
  app.delete('/admin/admin-groups/:id/', _require('/admin/admin-groups/index').delete);

  //admin > accounts
  app.get('/admin/accounts/', _require('/admin/accounts/index').find);
  app.post('/admin/accounts/', _require('/admin/accounts/index').create);
  app.get('/admin/accounts/:id/', _require('/admin/accounts/index').read);
  app.put('/admin/accounts/:id/', _require('/admin/accounts/index').update);
  app.put('/admin/accounts/:id/user/', _require('/admin/accounts/index').linkUser);
  app.delete('/admin/accounts/:id/user/', _require('/admin/accounts/index').unlinkUser);
  app.post('/admin/accounts/:id/notes/', _require('/admin/accounts/index').newNote);
  app.post('/admin/accounts/:id/status/', _require('/admin/accounts/index').newStatus);
  app.delete('/admin/accounts/:id/', _require('/admin/accounts/index').delete);

  //admin > statuses
  app.get('/admin/statuses/', _require('/admin/statuses/index').find);
  app.post('/admin/statuses/', _require('/admin/statuses/index').create);
  app.get('/admin/statuses/:id/', _require('/admin/statuses/index').read);
  app.put('/admin/statuses/:id/', _require('/admin/statuses/index').update);
  app.delete('/admin/statuses/:id/', _require('/admin/statuses/index').delete);

  //admin > categories
  app.get('/admin/categories/', _require('/admin/categories/index').find);
  app.post('/admin/categories/', _require('/admin/categories/index').create);
  app.get('/admin/categories/:id/', _require('/admin/categories/index').read);
  app.put('/admin/categories/:id/', _require('/admin/categories/index').update);
  app.delete('/admin/categories/:id/', _require('/admin/categories/index').delete);

  //admin > search
  app.get('/admin/search/', _require('/admin/search/index').find);

  //account
  app.all('/account*', ensureAuthenticated);
  app.all('/account*', ensureAccount);
  app.get('/account/', _require('/account/index').init);

  //account > verification
  app.get('/account/verification/', _require('/account/verification/index').init);
  app.post('/account/verification/', _require('/account/verification/index').resendVerification);
  app.get('/account/verification/:token/', _require('/account/verification/index').verify);

  //account > settings
  app.get('/account/settings/', _require('/account/settings/index').init);
  app.put('/account/settings/', _require('/account/settings/index').update);
  app.put('/account/settings/identity/', _require('/account/settings/index').identity);
  app.put('/account/settings/password/', _require('/account/settings/index').password);

  //account > settings > social
  app.get('/account/settings/twitter/', passport.authenticate('twitter', { callbackURL: '/account/settings/twitter/callback/' }));
  app.get('/account/settings/twitter/callback/', _require('/account/settings/index').connectTwitter);
  app.get('/account/settings/twitter/disconnect/', _require('/account/settings/index').disconnectTwitter);
  app.get('/account/settings/github/', passport.authenticate('github', { callbackURL: '/account/settings/github/callback/' }));
  app.get('/account/settings/github/callback/', _require('/account/settings/index').connectGitHub);
  app.get('/account/settings/github/disconnect/', _require('/account/settings/index').disconnectGitHub);
  app.get('/account/settings/facebook/', passport.authenticate('facebook', { callbackURL: '/account/settings/facebook/callback/' }));
  app.get('/account/settings/facebook/callback/', _require('/account/settings/index').connectFacebook);
  app.get('/account/settings/facebook/disconnect/', _require('/account/settings/index').disconnectFacebook);
  app.get('/account/settings/google/', passport.authenticate('google', { callbackURL: '/account/settings/google/callback/', scope: ['profile email'] }));
  app.get('/account/settings/google/callback/', _require('/account/settings/index').connectGoogle);
  app.get('/account/settings/google/disconnect/', _require('/account/settings/index').disconnectGoogle);
  app.get('/account/settings/tumblr/', passport.authenticate('tumblr', { callbackURL: '/account/settings/tumblr/callback/' }));
  app.get('/account/settings/tumblr/callback/', _require('/account/settings/index').connectTumblr);
  app.get('/account/settings/tumblr/disconnect/', _require('/account/settings/index').disconnectTumblr);

  //route not found
  //app.all('*', require(tmpl + '/http/index').http404);
};
