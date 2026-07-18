import type { WikitruthRequest } from './http';

export type ControllerParams = Record<string, string>;
export type ControllerQuery = Record<string, unknown>;

export type ControllerRequest<
  TBody extends Record<string, unknown> = Record<string, unknown>,
  TParams extends ControllerParams = ControllerParams,
  TQuery extends ControllerQuery = ControllerQuery,
> = Omit<WikitruthRequest, 'body' | 'params' | 'query'> & {
  body: Partial<TBody>;
  params: TParams;
  query: TQuery;
};

export function bodyOf<TBody extends Record<string, unknown>>(req: WikitruthRequest): Partial<TBody> {
  return ((req.body || {}) as Partial<TBody>);
}

export function queryOf<TQuery extends ControllerQuery>(req: WikitruthRequest): Partial<TQuery> {
  return ((req.query || {}) as Partial<TQuery>);
}

export function paramsOf<TParams extends ControllerParams>(req: WikitruthRequest): Partial<TParams> {
  return ((req.params || {}) as Partial<TParams>);
}

export type SignupBodyContract = {
  username?: unknown;
  email?: unknown;
  password?: unknown;
  recaptchaResponse?: unknown;
};

export type LoginBodyContract = {
  username?: unknown;
  password?: unknown;
};

export type RoleSwitchBodyContract = {
  role?: unknown;
};

export type FastSwitchBodyContract = {
  pin?: unknown;
};

export type AccountSettingsContactBodyContract = {
  first?: unknown;
  middle?: unknown;
  last?: unknown;
  company?: unknown;
  phone?: unknown;
  zip?: unknown;
};

export type AccountSettingsIdentityBodyContract = {
  username?: unknown;
  email?: unknown;
};

export type AccountSettingsPasswordBodyContract = {
  newPassword?: unknown;
  confirm?: unknown;
};

export type RefreshTokenBodyContract = {
  refreshToken?: unknown;
};

export type ForgotPasswordBodyContract = {
  email?: unknown;
};

export type ResetPasswordBodyContract = {
  email?: unknown;
  token?: unknown;
  password?: unknown;
};

export type VerificationResendBodyContract = {
  email?: unknown;
};

export type VerificationConfirmBodyContract = {
  token?: unknown;
};

export type AdminCreateUserBodyContract = {
  username?: unknown;
  email?: unknown;
  password?: unknown;
  roles?: {
    screener?: unknown;
    reviewer?: unknown;
  };
};

export type AdminSetPasswordBodyContract = {
  password?: unknown;
  newPassword?: unknown;
};

export type AdminRoleBindingBodyContract = {
  adminId?: unknown;
  accountId?: unknown;
  userId?: unknown;
};

export type AdminAccountNoteBodyContract = {
  data?: unknown;
  note?: unknown;
};

export type AdminAccountStatusBodyContract = {
  statusId?: unknown;
  id?: unknown;
};

export type AdminRoleMutationBodyContract = {
  screener?: unknown;
  reviewer?: unknown;
  roles?: {
    screener?: unknown;
    reviewer?: unknown;
  };
};

export type AdminPermissionsBodyContract = {
  permissions?: unknown;
  groups?: unknown;
};

export type AdminDbBackupActionBodyContract = {
  action?: unknown;
  buttonAction?: unknown;
  confirmText?: unknown;
  confirm?: unknown;
  restorePublicData?: unknown;
  restorePrivateData?: unknown;
};

export type AdminAuditEventsQueryContract = {
  page?: unknown;
  limit?: unknown;
  objectType?: unknown;
  eventTypes?: unknown;
};

export type ModerationObjectBodyContract = {
  id?: unknown;
  type?: unknown;
  objectType?: unknown;
  objectName?: unknown;
};

export type ModerationOwnershipBodyContract = {
  topicId?: unknown;
  id?: unknown;
  targetScope?: unknown;
  target?: unknown;
  username?: unknown;
};

export type ModerationStatusBodyContract = {
  status?: unknown;
  screeningStatus?: unknown;
  verdictStatus?: unknown;
  reasoning?: unknown;
  verdictReasoning?: unknown;
  overrideReason?: unknown;
  acknowledgeOverride?: unknown;
  rationale?: unknown;
  signalType?: unknown;
  note?: unknown;
  resolutionNote?: unknown;
  reasonType?: unknown;
  targetType?: unknown;
  archiveSource?: unknown;
  reason?: unknown;
  updates?: Array<Record<string, unknown>>;
};

export type ModerationListQueryContract = {
  objectType?: unknown;
  status?: unknown;
  verdictStatus?: unknown;
  page?: unknown;
  limit?: unknown;
  q?: unknown;
  signalType?: unknown;
  reasonType?: unknown;
};
