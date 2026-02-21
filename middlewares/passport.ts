'use strict';

import type { AppContext } from '../types/models';
import type { AuthUser } from '../types/auth';

const LocalStrategy = require('passport-local').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const GitHubStrategy = require('passport-github').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google').Strategy;

interface PassportLike {
  use(strategy: unknown): void;
  serializeUser(cb: (user: AuthUser, done: (error: unknown, id?: unknown) => void) => void): void;
  deserializeUser(cb: (id: string, done: (error: unknown, user?: unknown) => void) => Promise<void> | void): void;
}

interface UserModelContract {
  findOne(query: Record<string, unknown>): {
    populate(field: string): {
      populate(field: string): Promise<AuthUser | null>;
    };
    then?: unknown;
  } & Promise<AuthUser | null>;
  validatePassword(password: string, hash: string): Promise<boolean>;
}

interface AppWithConfig extends AppContext {
  config: {
    projectName: string;
    oauth: {
      twitter: { key?: string; secret?: string };
      github: { key?: string; secret?: string };
      facebook: { key?: string; secret?: string };
      google: { key?: string; secret?: string };
    };
  };
}

module.exports = function configurePassport(app: AppWithConfig, passport: PassportLike): void {
  const db = app.db.models as unknown as {
    User: UserModelContract;
  };

  passport.use(
    new LocalStrategy(async function (username: string, password: string, done: (error: unknown, user?: unknown, info?: unknown) => void) {
      const conditions: { isActive: string; username?: string; email?: string } = { isActive: 'yes' };
      if (username.indexOf('@') === -1) {
        conditions.username = username;
      } else {
        conditions.email = username.toLowerCase();
      }

      const user = await db.User.findOne(conditions);
      if (!user) {
        done(null, false, { message: 'Unknown user' });
        return;
      }

      const isValid = await db.User.validatePassword(password, (user as AuthUser & { password?: string }).password || '');
      if (!isValid) {
        done(null, false, { message: 'Invalid password' });
        return;
      }

      done(null, user);
    })
  );

  if (app.config.oauth.twitter.key) {
    passport.use(
      new TwitterStrategy(
        {
          consumerKey: app.config.oauth.twitter.key,
          consumerSecret: app.config.oauth.twitter.secret,
        },
        function (
          token: string,
          tokenSecret: string,
          profile: unknown,
          done: (error: unknown, user?: unknown, info?: unknown) => void
        ) {
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
        function (
          accessToken: string,
          refreshToken: string,
          profile: unknown,
          done: (error: unknown, user?: unknown, info?: unknown) => void
        ) {
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
        function (
          accessToken: string,
          refreshToken: string,
          profile: unknown,
          done: (error: unknown, user?: unknown, info?: unknown) => void
        ) {
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
        function (
          accessToken: string,
          refreshToken: string,
          profile: unknown,
          done: (error: unknown, user?: unknown, info?: unknown) => void
        ) {
          done(null, false, {
            accessToken: accessToken,
            refreshToken: refreshToken,
            profile: profile,
          });
        }
      )
    );
  }

  passport.serializeUser(function (user, done) {
    done(null, user._id);
  });

  passport.deserializeUser(async function (id, done) {
    const user = await db.User.findOne({ _id: id })
      .populate('roles.admin')
      .populate('roles.account');
    if (user?.roles?.admin) {
      await (user.roles.admin as { populate?: (field: string) => Promise<unknown> }).populate?.('groups');
    }
    done(null, user);
  });
};
