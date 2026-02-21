'use strict';

// @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
let LocalStrategy = require('passport-local').Strategy,
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  TwitterStrategy = require('passport-twitter').Strategy,
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  GitHubStrategy = require('passport-github').Strategy,
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  FacebookStrategy = require('passport-facebook').Strategy,
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  GoogleStrategy = require('passport-google').Strategy;
  // TumblrStrategy = require('passport-tumblr').Strategy;

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (app, passport) {
  const db = app.db.models;

  passport.use(
    // @ts-ignore TS(7006): Parameter 'username' implicitly has an 'any' type.
    new LocalStrategy(async function (username, password, done) {
      let conditions = { isActive: 'yes' };
      if (username.indexOf('@') === -1) {
        // @ts-ignore TS(2339): Property 'username' does not exist on type '{ isAc... Remove this comment to see the full error message
        conditions.username = username;
      } else {
        // @ts-ignore TS(2339): Property 'email' does not exist on type '{ isActiv... Remove this comment to see the full error message
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
        // @ts-ignore TS(7006): Parameter 'token' implicitly has an 'any' type.
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
        // @ts-ignore TS(7006): Parameter 'accessToken' implicitly has an 'any' ty... Remove this comment to see the full error message
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
        // @ts-ignore TS(7006): Parameter 'accessToken' implicitly has an 'any' ty... Remove this comment to see the full error message
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
        // @ts-ignore TS(7006): Parameter 'accessToken' implicitly has an 'any' ty... Remove this comment to see the full error message
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

  // @ts-ignore TS(7006): Parameter 'user' implicitly has an 'any' type.
  passport.serializeUser(function (user, done) {
    done(null, user._id);
  });

  // @ts-ignore TS(7006): Parameter 'id' implicitly has an 'any' type.
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
