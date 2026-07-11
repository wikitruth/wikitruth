'use strict';

import passportOAuth1 from 'passport-oauth1';

interface TwitterStrategyOptions {
  consumerKey: string;
  consumerSecret?: string;
  requestTokenURL?: string;
  accessTokenURL?: string;
  userAuthorizationURL?: string;
  userProfileURL?: string;
  sessionKey?: string;
  skipExtendedUserProfile?: boolean;
  includeEmail?: boolean;
  includeStatus?: boolean;
  includeEntities?: boolean;
}

interface TwitterProfile {
  provider: 'twitter';
  id: string;
  username?: string;
  displayName?: string;
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
  _raw?: string;
  _json?: Record<string, unknown>;
  _accessLevel?: string | string[];
}

interface OAuthError extends Error {
  data?: string;
}

interface OAuthResponse {
  headers: Record<string, string | string[] | undefined>;
}

interface OAuthClient {
  get(
    url: string,
    token: string,
    tokenSecret: string,
    callback: (error: OAuthError | null, body: string, response: OAuthResponse) => void
  ): void;
}

interface OAuth1StrategyBase {
  name: string;
  _oauth: OAuthClient;
  fail(): void;
}

type VerifyCallback = (...args: unknown[]) => void;
type OAuth1StrategyConstructor = new (
  options: Record<string, unknown>,
  verify: VerifyCallback
) => OAuth1StrategyBase;

interface OAuth1Module {
  Strategy: OAuth1StrategyConstructor;
  InternalOAuthError: new (message: string, error: unknown) => Error;
}

const oauth1Module = passportOAuth1 as unknown as OAuth1Module;
const OAuth1Strategy = oauth1Module.Strategy;
const InternalOAuthError = oauth1Module.InternalOAuthError;

function parseProfile(json: Record<string, unknown>): TwitterProfile {
  const profile: TwitterProfile = {
    provider: 'twitter',
    id: String(json.id_str || json.id || ''),
  };
  if (typeof json.screen_name === 'string') profile.username = json.screen_name;
  if (typeof json.name === 'string') profile.displayName = json.name;
  if (typeof json.email === 'string' && json.email) profile.emails = [{ value: json.email }];
  if (typeof json.profile_image_url_https === 'string' && json.profile_image_url_https) {
    profile.photos = [{ value: json.profile_image_url_https }];
  }
  return profile;
}

function firstTwitterError(json: unknown): { message: string; code?: number } | null {
  if (!json || typeof json !== 'object') return null;
  const errors = (json as { errors?: unknown }).errors;
  if (!Array.isArray(errors) || !errors.length) return null;
  const first = errors[0];
  if (!first || typeof first !== 'object') return null;
  const message = (first as { message?: unknown }).message;
  const code = (first as { code?: unknown }).code;
  return typeof message === 'string'
    ? { message, code: typeof code === 'number' ? code : undefined }
    : null;
}

export default class TwitterStrategy extends OAuth1Strategy {
  private readonly userProfileUrl: string;
  private readonly skipExtendedUserProfile: boolean;
  private readonly includeEmail: boolean;
  private readonly includeStatus: boolean;
  private readonly includeEntities: boolean;

  constructor(options: TwitterStrategyOptions, verify: VerifyCallback) {
    super(
      {
        ...options,
        requestTokenURL: options.requestTokenURL || 'https://api.twitter.com/oauth/request_token',
        accessTokenURL: options.accessTokenURL || 'https://api.twitter.com/oauth/access_token',
        userAuthorizationURL: options.userAuthorizationURL || 'https://api.twitter.com/oauth/authenticate',
        sessionKey: options.sessionKey || 'oauth:twitter',
      },
      verify
    );
    this.name = 'twitter';
    this.userProfileUrl = options.userProfileURL || 'https://api.twitter.com/1.1/account/verify_credentials.json';
    this.skipExtendedUserProfile = options.skipExtendedUserProfile === true;
    this.includeEmail = options.includeEmail === true;
    this.includeStatus = options.includeStatus !== false;
    this.includeEntities = options.includeEntities !== false;
  }

  authenticate(req: { query?: Record<string, unknown> }, options?: Record<string, unknown>): void {
    if (req.query?.denied) {
      this.fail();
      return;
    }
    OAuth1Strategy.prototype.authenticate.call(this, req, options);
  }

  userProfile(
    token: string,
    tokenSecret: string,
    params: Record<string, unknown>,
    done: (error: Error | null, profile?: TwitterProfile) => void
  ): void {
    if (this.skipExtendedUserProfile) {
      done(null, {
        provider: 'twitter',
        id: String(params.user_id || ''),
        username: typeof params.screen_name === 'string' ? params.screen_name : undefined,
      });
      return;
    }

    const profileUrl = new URL(this.userProfileUrl);
    if (profileUrl.pathname.endsWith('/users/show.json')) {
      profileUrl.searchParams.set('user_id', String(params.user_id || ''));
    }
    if (this.includeEmail) profileUrl.searchParams.set('include_email', 'true');
    if (!this.includeStatus) profileUrl.searchParams.set('skip_status', 'true');
    if (!this.includeEntities) profileUrl.searchParams.set('include_entities', 'false');

    this._oauth.get(profileUrl.toString(), token, tokenSecret, (error, body, response) => {
      if (error) {
        const parsedError = error.data ? this.parseJsonError(error.data) : null;
        done(parsedError || new InternalOAuthError('Failed to fetch Twitter user profile', error));
        return;
      }

      try {
        const json = JSON.parse(body) as Record<string, unknown>;
        const profile = parseProfile(json);
        profile._raw = body;
        profile._json = json;
        profile._accessLevel = response.headers['x-access-level'];
        done(null, profile);
      } catch {
        done(new Error('Failed to parse Twitter user profile'));
      }
    });
  }

  userAuthorizationParams(options: Record<string, unknown>): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    if (options.forceLogin) params.force_login = options.forceLogin;
    if (options.screenName) params.screen_name = options.screenName;
    return params;
  }

  parseErrorResponse(body: string, status: number): Error {
    const parsedError = this.parseJsonError(body);
    if (parsedError) return parsedError;

    const detail = body
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 300);
    return new Error(detail || `Twitter API request failed (${status})`);
  }

  private parseJsonError(body: string): Error | null {
    try {
      const twitterError = firstTwitterError(JSON.parse(body));
      if (!twitterError) return null;
      const error = new Error(twitterError.message) as Error & { code?: number; status?: number };
      error.name = 'TwitterAPIError';
      error.code = twitterError.code;
      error.status = 500;
      return error;
    } catch {
      return null;
    }
  }
}
