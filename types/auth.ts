export interface AuthRoles {
  [roleName: string]: unknown;
  admin?: unknown;
  account?: {
    isVerified?: string;
    [key: string]: unknown;
  };
  screener?: boolean;
  reviewer?: boolean;
}

export interface AuthUser {
  _id: string;
  id: string;
  username: string;
  email?: string;
  roles?: AuthRoles;
  preferences?: Record<string, unknown> & {
    privateProfile?: boolean;
  };
  canPlayRoleOf: (role: string) => boolean;
  defaultReturnUrl: () => string;
  isAdmin: () => boolean;
}
