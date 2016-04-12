'use strict';

var tmplRoot = '../public/templates/jade';

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

exports = module.exports = function(app, passport) {
  //front end
  app.get('/home/', require(tmplRoot + '/index').init);
  app.get('/about/', require(tmplRoot + '/about/index').init);
  app.get('/contact/', require(tmplRoot + '/contact/index').init);
  app.post('/contact/', require(tmplRoot + '/contact/index').sendMessage);

  //sign up
  app.get('/signup/', require(tmplRoot + '/signup/index').init);
  app.post('/signup/', require(tmplRoot + '/signup/index').signup);

  //social sign up
  app.post('/signup/social/', require(tmplRoot + '/signup/index').signupSocial);
  app.get('/signup/twitter/', passport.authenticate('twitter', { callbackURL: '/signup/twitter/callback/' }));
  app.get('/signup/twitter/callback/', require(tmplRoot + '/signup/index').signupTwitter);
  app.get('/signup/github/', passport.authenticate('github', { callbackURL: '/signup/github/callback/', scope: ['user:email'] }));
  app.get('/signup/github/callback/', require(tmplRoot + '/signup/index').signupGitHub);
  app.get('/signup/facebook/', passport.authenticate('facebook', { callbackURL: '/signup/facebook/callback/', scope: ['email'] }));
  app.get('/signup/facebook/callback/', require(tmplRoot + '/signup/index').signupFacebook);
  app.get('/signup/google/', passport.authenticate('google', { callbackURL: '/signup/google/callback/', scope: ['profile email'] }));
  app.get('/signup/google/callback/', require(tmplRoot + '/signup/index').signupGoogle);
  app.get('/signup/tumblr/', passport.authenticate('tumblr', { callbackURL: '/signup/tumblr/callback/' }));
  app.get('/signup/tumblr/callback/', require(tmplRoot + '/signup/index').signupTumblr);

  //login/out
  app.get('/login/', require(tmplRoot + '/login/index').init);
  app.post('/login/', require(tmplRoot + '/login/index').login);
  app.get('/login/forgot/', require(tmplRoot + '/login/forgot/index').init);
  app.post('/login/forgot/', require(tmplRoot + '/login/forgot/index').send);
  app.get('/login/reset/', require(tmplRoot + '/login/reset/index').init);
  app.get('/login/reset/:email/:token/', require(tmplRoot + '/login/reset/index').init);
  app.put('/login/reset/:email/:token/', require(tmplRoot + '/login/reset/index').set);
  app.get('/logout/', require(tmplRoot + '/logout/index').init);

  //social login
  app.get('/login/twitter/', passport.authenticate('twitter', { callbackURL: '/login/twitter/callback/' }));
  app.get('/login/twitter/callback/', require(tmplRoot + '/login/index').loginTwitter);
  app.get('/login/github/', passport.authenticate('github', { callbackURL: '/login/github/callback/' }));
  app.get('/login/github/callback/', require(tmplRoot + '/login/index').loginGitHub);
  app.get('/login/facebook/', passport.authenticate('facebook', { callbackURL: '/login/facebook/callback/' }));
  app.get('/login/facebook/callback/', require(tmplRoot + '/login/index').loginFacebook);
  app.get('/login/google/', passport.authenticate('google', { callbackURL: '/login/google/callback/', scope: ['profile email'] }));
  app.get('/login/google/callback/', require(tmplRoot + '/login/index').loginGoogle);
  app.get('/login/tumblr/', passport.authenticate('tumblr', { callbackURL: '/login/tumblr/callback/', scope: ['profile email'] }));
  app.get('/login/tumblr/callback/', require(tmplRoot + '/login/index').loginTumblr);

  //admin
  app.all('/admin*', ensureAuthenticated);
  app.all('/admin*', ensureAdmin);
  app.get('/admin/', require(tmplRoot + '/admin/index').init);

  //admin > users
  app.get('/admin/users/', require(tmplRoot + '/admin/users/index').find);
  app.post('/admin/users/', require(tmplRoot + '/admin/users/index').create);
  app.get('/admin/users/:id/', require(tmplRoot + '/admin/users/index').read);
  app.put('/admin/users/:id/', require(tmplRoot + '/admin/users/index').update);
  app.put('/admin/users/:id/password/', require(tmplRoot + '/admin/users/index').password);
  app.put('/admin/users/:id/role-admin/', require(tmplRoot + '/admin/users/index').linkAdmin);
  app.delete('/admin/users/:id/role-admin/', require(tmplRoot + '/admin/users/index').unlinkAdmin);
  app.put('/admin/users/:id/role-account/', require(tmplRoot + '/admin/users/index').linkAccount);
  app.delete('/admin/users/:id/role-account/', require(tmplRoot + '/admin/users/index').unlinkAccount);
  app.delete('/admin/users/:id/', require(tmplRoot + '/admin/users/index').delete);

  //admin > administrators
  app.get('/admin/administrators/', require(tmplRoot + '/admin/administrators/index').find);
  app.post('/admin/administrators/', require(tmplRoot + '/admin/administrators/index').create);
  app.get('/admin/administrators/:id/', require(tmplRoot + '/admin/administrators/index').read);
  app.put('/admin/administrators/:id/', require(tmplRoot + '/admin/administrators/index').update);
  app.put('/admin/administrators/:id/permissions/', require(tmplRoot + '/admin/administrators/index').permissions);
  app.put('/admin/administrators/:id/groups/', require(tmplRoot + '/admin/administrators/index').groups);
  app.put('/admin/administrators/:id/user/', require(tmplRoot + '/admin/administrators/index').linkUser);
  app.delete('/admin/administrators/:id/user/', require(tmplRoot + '/admin/administrators/index').unlinkUser);
  app.delete('/admin/administrators/:id/', require(tmplRoot + '/admin/administrators/index').delete);

  //admin > admin groups
  app.get('/admin/admin-groups/', require(tmplRoot + '/admin/admin-groups/index').find);
  app.post('/admin/admin-groups/', require(tmplRoot + '/admin/admin-groups/index').create);
  app.get('/admin/admin-groups/:id/', require(tmplRoot + '/admin/admin-groups/index').read);
  app.put('/admin/admin-groups/:id/', require(tmplRoot + '/admin/admin-groups/index').update);
  app.put('/admin/admin-groups/:id/permissions/', require(tmplRoot + '/admin/admin-groups/index').permissions);
  app.delete('/admin/admin-groups/:id/', require(tmplRoot + '/admin/admin-groups/index').delete);

  //admin > accounts
  app.get('/admin/accounts/', require(tmplRoot + '/admin/accounts/index').find);
  app.post('/admin/accounts/', require(tmplRoot + '/admin/accounts/index').create);
  app.get('/admin/accounts/:id/', require(tmplRoot + '/admin/accounts/index').read);
  app.put('/admin/accounts/:id/', require(tmplRoot + '/admin/accounts/index').update);
  app.put('/admin/accounts/:id/user/', require(tmplRoot + '/admin/accounts/index').linkUser);
  app.delete('/admin/accounts/:id/user/', require(tmplRoot + '/admin/accounts/index').unlinkUser);
  app.post('/admin/accounts/:id/notes/', require(tmplRoot + '/admin/accounts/index').newNote);
  app.post('/admin/accounts/:id/status/', require(tmplRoot + '/admin/accounts/index').newStatus);
  app.delete('/admin/accounts/:id/', require(tmplRoot + '/admin/accounts/index').delete);

  //admin > statuses
  app.get('/admin/statuses/', require(tmplRoot + '/admin/statuses/index').find);
  app.post('/admin/statuses/', require(tmplRoot + '/admin/statuses/index').create);
  app.get('/admin/statuses/:id/', require(tmplRoot + '/admin/statuses/index').read);
  app.put('/admin/statuses/:id/', require(tmplRoot + '/admin/statuses/index').update);
  app.delete('/admin/statuses/:id/', require(tmplRoot + '/admin/statuses/index').delete);

  //admin > categories
  app.get('/admin/categories/', require(tmplRoot + '/admin/categories/index').find);
  app.post('/admin/categories/', require(tmplRoot + '/admin/categories/index').create);
  app.get('/admin/categories/:id/', require(tmplRoot + '/admin/categories/index').read);
  app.put('/admin/categories/:id/', require(tmplRoot + '/admin/categories/index').update);
  app.delete('/admin/categories/:id/', require(tmplRoot + '/admin/categories/index').delete);

  //admin > search
  app.get('/admin/search/', require(tmplRoot + '/admin/search/index').find);

  //account
  app.all('/account*', ensureAuthenticated);
  app.all('/account*', ensureAccount);
  app.get('/account/', require(tmplRoot + '/account/index').init);

  //account > verification
  app.get('/account/verification/', require(tmplRoot + '/account/verification/index').init);
  app.post('/account/verification/', require(tmplRoot + '/account/verification/index').resendVerification);
  app.get('/account/verification/:token/', require(tmplRoot + '/account/verification/index').verify);

  //account > settings
  app.get('/account/settings/', require(tmplRoot + '/account/settings/index').init);
  app.put('/account/settings/', require(tmplRoot + '/account/settings/index').update);
  app.put('/account/settings/identity/', require(tmplRoot + '/account/settings/index').identity);
  app.put('/account/settings/password/', require(tmplRoot + '/account/settings/index').password);

  //account > settings > social
  app.get('/account/settings/twitter/', passport.authenticate('twitter', { callbackURL: '/account/settings/twitter/callback/' }));
  app.get('/account/settings/twitter/callback/', require(tmplRoot + '/account/settings/index').connectTwitter);
  app.get('/account/settings/twitter/disconnect/', require(tmplRoot + '/account/settings/index').disconnectTwitter);
  app.get('/account/settings/github/', passport.authenticate('github', { callbackURL: '/account/settings/github/callback/' }));
  app.get('/account/settings/github/callback/', require(tmplRoot + '/account/settings/index').connectGitHub);
  app.get('/account/settings/github/disconnect/', require(tmplRoot + '/account/settings/index').disconnectGitHub);
  app.get('/account/settings/facebook/', passport.authenticate('facebook', { callbackURL: '/account/settings/facebook/callback/' }));
  app.get('/account/settings/facebook/callback/', require(tmplRoot + '/account/settings/index').connectFacebook);
  app.get('/account/settings/facebook/disconnect/', require(tmplRoot + '/account/settings/index').disconnectFacebook);
  app.get('/account/settings/google/', passport.authenticate('google', { callbackURL: '/account/settings/google/callback/', scope: ['profile email'] }));
  app.get('/account/settings/google/callback/', require(tmplRoot + '/account/settings/index').connectGoogle);
  app.get('/account/settings/google/disconnect/', require(tmplRoot + '/account/settings/index').disconnectGoogle);
  app.get('/account/settings/tumblr/', passport.authenticate('tumblr', { callbackURL: '/account/settings/tumblr/callback/' }));
  app.get('/account/settings/tumblr/callback/', require(tmplRoot + '/account/settings/index').connectTumblr);
  app.get('/account/settings/tumblr/disconnect/', require(tmplRoot + '/account/settings/index').disconnectTumblr);

  //route not found
  //app.all('*', require(tmpl + '/http/index').http404);
};
