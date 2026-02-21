export interface AuthRoles {
  [roleName: string]: unknown;
  account?: {
    isVerified?: string;
    [key: string]: unknown;
  };
}

export interface AuthUser {
  _id?: string;
  id?: string;
  username?: string;
  email?: string;
  roles?: AuthRoles;
  canPlayRoleOf?: (role: string) => boolean;
}
