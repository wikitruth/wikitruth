'use strict';

var tmplRoot = '../public/templates/jade',
    paths     = require('../models/paths');

function req(code) {
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

function ensureScreener(req, res, next) {
  if (req.user.canPlayRoleOf('screener')) {
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

  app.get(paths.wiki.topics.create, ensureAuthenticated);
  app.get(paths.wiki.arguments.create, ensureAuthenticated);
  app.get(paths.wiki.questions.create, ensureAuthenticated);
  app.get(paths.wiki.answers.create, ensureAuthenticated);
  app.get(paths.wiki.issues.create, ensureAuthenticated);
  app.get(paths.wiki.opinions.create, ensureAuthenticated);

  // member diary
  app.all('/members/:username/diary*', ensureAuthenticated);
  app.all('/members/:username/diary*', ensureAccountOwner);

  app.post(paths.wiki.screening, ensureAuthenticated);
  app.post(paths.wiki.screening, ensureScreener);

  //front end
  app.get('/home/', req('/index').init);
  app.get('/about/', req('/about/index').init);
  app.get('/contact/', req('/contact/index').init);
  app.post('/contact/', req('/contact/index').sendMessage);

  //sign up
  app.get('/signup/', req('/signup/index').init);
  app.post('/signup/', req('/signup/index').signup);

  //social sign up
  app.post('/signup/social/', req('/signup/index').signupSocial);
  app.get('/signup/twitter/', passport.authenticate('twitter', { callbackURL: '/signup/twitter/callback/' }));
  app.get('/signup/twitter/callback/', req('/signup/index').signupTwitter);
  app.get('/signup/github/', passport.authenticate('github', { callbackURL: '/signup/github/callback/', scope: ['user:email'] }));
  app.get('/signup/github/callback/', req('/signup/index').signupGitHub);
  app.get('/signup/facebook/', passport.authenticate('facebook', { callbackURL: '/signup/facebook/callback/', scope: ['email'] }));
  app.get('/signup/facebook/callback/', req('/signup/index').signupFacebook);
  app.get('/signup/google/', passport.authenticate('google', { callbackURL: '/signup/google/callback/', scope: ['profile email'] }));
  app.get('/signup/google/callback/', req('/signup/index').signupGoogle);
  app.get('/signup/tumblr/', passport.authenticate('tumblr', { callbackURL: '/signup/tumblr/callback/' }));
  app.get('/signup/tumblr/callback/', req('/signup/index').signupTumblr);

  //login/out
  app.get('/login/', req('/login/index').init);
  app.post('/login/', req('/login/index').login);
  app.get('/login/forgot/', req('/login/forgot/index').init);
  app.post('/login/forgot/', req('/login/forgot/index').send);
  app.get('/login/reset/', req('/login/reset/index').init);
  app.get('/login/reset/:email/:token/', req('/login/reset/index').init);
  app.put('/login/reset/:email/:token/', req('/login/reset/index').set);
  app.get('/logout/', req('/logout/index').init);

  //social login
  app.get('/login/twitter/', passport.authenticate('twitter', { callbackURL: '/login/twitter/callback/' }));
  app.get('/login/twitter/callback/', req('/login/index').loginTwitter);
  app.get('/login/github/', passport.authenticate('github', { callbackURL: '/login/github/callback/' }));
  app.get('/login/github/callback/', req('/login/index').loginGitHub);
  app.get('/login/facebook/', passport.authenticate('facebook', { callbackURL: '/login/facebook/callback/' }));
  app.get('/login/facebook/callback/', req('/login/index').loginFacebook);
  app.get('/login/google/', passport.authenticate('google', { callbackURL: '/login/google/callback/', scope: ['profile email'] }));
  app.get('/login/google/callback/', req('/login/index').loginGoogle);
  app.get('/login/tumblr/', passport.authenticate('tumblr', { callbackURL: '/login/tumblr/callback/', scope: ['profile email'] }));
  app.get('/login/tumblr/callback/', req('/login/index').loginTumblr);

  //admin
  app.all('/admin*', ensureAuthenticated);
  app.all('/admin*', ensureAdmin);
  app.get('/admin/', req('/admin/index').init);

  //admin > users
  app.get('/admin/users/', req('/admin/users/index').find);
  app.post('/admin/users/', req('/admin/users/index').create);
  app.get('/admin/users/:id/', req('/admin/users/index').read);
  app.put('/admin/users/:id/', req('/admin/users/index').update);
  app.put('/admin/users/:id/password/', req('/admin/users/index').password);
  app.put('/admin/users/:id/role-admin/', req('/admin/users/index').linkAdmin);
  app.delete('/admin/users/:id/role-admin/', req('/admin/users/index').unlinkAdmin);
  app.put('/admin/users/:id/role-account/', req('/admin/users/index').linkAccount);
  app.put('/admin/users/:id/roles/', req('/admin/users/index').updateRoles);
  app.delete('/admin/users/:id/role-account/', req('/admin/users/index').unlinkAccount);
  app.delete('/admin/users/:id/', req('/admin/users/index').delete);

  //admin > administrators
  app.get('/admin/administrators/', req('/admin/administrators/index').find);
  app.post('/admin/administrators/', req('/admin/administrators/index').create);
  app.get('/admin/administrators/:id/', req('/admin/administrators/index').read);
  app.put('/admin/administrators/:id/', req('/admin/administrators/index').update);
  app.put('/admin/administrators/:id/permissions/', req('/admin/administrators/index').permissions);
  app.put('/admin/administrators/:id/groups/', req('/admin/administrators/index').groups);
  app.put('/admin/administrators/:id/user/', req('/admin/administrators/index').linkUser);
  app.delete('/admin/administrators/:id/user/', req('/admin/administrators/index').unlinkUser);
  app.delete('/admin/administrators/:id/', req('/admin/administrators/index').delete);

  //admin > admin groups
  app.get('/admin/admin-groups/', req('/admin/admin-groups/index').find);
  app.post('/admin/admin-groups/', req('/admin/admin-groups/index').create);
  app.get('/admin/admin-groups/:id/', req('/admin/admin-groups/index').read);
  app.put('/admin/admin-groups/:id/', req('/admin/admin-groups/index').update);
  app.put('/admin/admin-groups/:id/permissions/', req('/admin/admin-groups/index').permissions);
  app.delete('/admin/admin-groups/:id/', req('/admin/admin-groups/index').delete);

  //admin > accounts
  app.get('/admin/accounts/', req('/admin/accounts/index').find);
  app.post('/admin/accounts/', req('/admin/accounts/index').create);
  app.get('/admin/accounts/:id/', req('/admin/accounts/index').read);
  app.put('/admin/accounts/:id/', req('/admin/accounts/index').update);
  app.put('/admin/accounts/:id/user/', req('/admin/accounts/index').linkUser);
  app.delete('/admin/accounts/:id/user/', req('/admin/accounts/index').unlinkUser);
  app.post('/admin/accounts/:id/notes/', req('/admin/accounts/index').newNote);
  app.post('/admin/accounts/:id/status/', req('/admin/accounts/index').newStatus);
  app.delete('/admin/accounts/:id/', req('/admin/accounts/index').delete);

  //admin > statuses
  app.get('/admin/statuses/', req('/admin/statuses/index').find);
  app.post('/admin/statuses/', req('/admin/statuses/index').create);
  app.get('/admin/statuses/:id/', req('/admin/statuses/index').read);
  app.put('/admin/statuses/:id/', req('/admin/statuses/index').update);
  app.delete('/admin/statuses/:id/', req('/admin/statuses/index').delete);

  //admin > categories
  app.get('/admin/categories/', req('/admin/categories/index').find);
  app.post('/admin/categories/', req('/admin/categories/index').create);
  app.get('/admin/categories/:id/', req('/admin/categories/index').read);
  app.put('/admin/categories/:id/', req('/admin/categories/index').update);
  app.delete('/admin/categories/:id/', req('/admin/categories/index').delete);

  //admin > search
  app.get('/admin/search/', req('/admin/search/index').find);

  //account
  app.all('/account*', ensureAuthenticated);
  app.all('/account*', ensureAccount);
  app.get('/account/', req('/account/index').init);

  //account > verification
  app.get('/account/verification/', req('/account/verification/index').init);
  app.post('/account/verification/', req('/account/verification/index').resendVerification);
  app.get('/account/verification/:token/', req('/account/verification/index').verify);

  //account > settings
  app.get('/account/settings/', req('/account/settings/index').init);
  app.put('/account/settings/', req('/account/settings/index').update);
  app.put('/account/settings/identity/', req('/account/settings/index').identity);
  app.put('/account/settings/password/', req('/account/settings/index').password);

  //account > settings > social
  app.get('/account/settings/twitter/', passport.authenticate('twitter', { callbackURL: '/account/settings/twitter/callback/' }));
  app.get('/account/settings/twitter/callback/', req('/account/settings/index').connectTwitter);
  app.get('/account/settings/twitter/disconnect/', req('/account/settings/index').disconnectTwitter);
  app.get('/account/settings/github/', passport.authenticate('github', { callbackURL: '/account/settings/github/callback/' }));
  app.get('/account/settings/github/callback/', req('/account/settings/index').connectGitHub);
  app.get('/account/settings/github/disconnect/', req('/account/settings/index').disconnectGitHub);
  app.get('/account/settings/facebook/', passport.authenticate('facebook', { callbackURL: '/account/settings/facebook/callback/' }));
  app.get('/account/settings/facebook/callback/', req('/account/settings/index').connectFacebook);
  app.get('/account/settings/facebook/disconnect/', req('/account/settings/index').disconnectFacebook);
  app.get('/account/settings/google/', passport.authenticate('google', { callbackURL: '/account/settings/google/callback/', scope: ['profile email'] }));
  app.get('/account/settings/google/callback/', req('/account/settings/index').connectGoogle);
  app.get('/account/settings/google/disconnect/', req('/account/settings/index').disconnectGoogle);
  app.get('/account/settings/tumblr/', passport.authenticate('tumblr', { callbackURL: '/account/settings/tumblr/callback/' }));
  app.get('/account/settings/tumblr/callback/', req('/account/settings/index').connectTumblr);
  app.get('/account/settings/tumblr/disconnect/', req('/account/settings/index').disconnectTumblr);

  //route not found
  //app.all('*', require(tmpl + '/http/index').http404);
};
