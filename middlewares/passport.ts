// @ts-nocheck
'use strict';

let LocalStrategy = require('passport-local').Strategy,
  TwitterStrategy = require('passport-twitter').Strategy,
  GitHubStrategy = require('passport-github').Strategy,
  FacebookStrategy = require('passport-facebook').Strategy,
  GoogleStrategy = require('passport-google').Strategy;
  // TumblrStrategy = require('passport-tumblr').Strategy;

module.exports = function (app, passport) {
  const db = app.db.models;

  passport.use(
    new LocalStrategy(async function (username, password, done) {
      let conditions = { isActive: 'yes' };
      if (username.indexOf('@') === -1) {
        conditions.username = username;
      } else {
        conditions.email = username.toLowerCase();
      }

      const user = await db.User.findOne(conditions);
      if (!user) {
        return done(null, false, { message: 'Unknown user' });
      }

      const isValid = await db.User.validatePassword(password, user.password);
      if (!isValid) {
        return done(null, false, { message: 'Invalid password' });
      }
      return done(null, user);
    })
  );

  if (app.config.oauth.twitter.key) {
    passport.use(
      new TwitterStrategy(
        {
          consumerKey: app.config.oauth.twitter.key,
          consumerSecret: app.config.oauth.twitter.secret,
        },
        function (token, tokenSecret, profile, done) {
          done(null, false, {
            token: token,
            tokenSecret: tokenSecret,
            profile: profile,
          });
        }
      )
    );
  }

  if (app.config.oauth.github.key) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: app.config.oauth.github.key,
          clientSecret: app.config.oauth.github.secret,
          customHeaders: { 'User-Agent': app.config.projectName },
        },
        function (accessToken, refreshToken, profile, done) {
          done(null, false, {
            accessToken: accessToken,
            refreshToken: refreshToken,
            profile: profile,
          });
        }
      )
    );
  }

  if (app.config.oauth.facebook.key) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: app.config.oauth.facebook.key,
          clientSecret: app.config.oauth.facebook.secret,
        },
        function (accessToken, refreshToken, profile, done) {
          done(null, false, {
            accessToken: accessToken,
            refreshToken: refreshToken,
            profile: profile,
          });
        }
      )
    );
  }

  if (app.config.oauth.google.key) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: app.config.oauth.google.key,
          clientSecret: app.config.oauth.google.secret,
        },
        function (accessToken, refreshToken, profile, done) {
          done(null, false, {
            accessToken: accessToken,
            refreshToken: refreshToken,
            profile: profile,
          });
        }
      )
    );
  }

  // if (app.config.oauth.tumblr.key) {
  //   passport.use(new TumblrStrategy({
  //       consumerKey: app.config.oauth.tumblr.key,
  //       consumerSecret: app.config.oauth.tumblr.secret
  //     },
  //     function(token, tokenSecret, profile, done) {
  //       done(null, false, {
  //         token: token,
  //         tokenSecret: tokenSecret,
  //         profile: profile
  //       });
  //     }
  //   ));
  // }

  passport.serializeUser(function (user, done) {
    done(null, user._id);
  });

  passport.deserializeUser(async function (id, done) {
    const user = await db.User.findOne({ _id: id })
      .populate('roles.admin')
      .populate('roles.account');
    if (user?.roles?.admin) {
      await user.roles.admin.populate('groups');
    }
    done(null, user);
  });
};
