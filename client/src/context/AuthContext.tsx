import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { User } from '../types';
import authApi from '../services/api/auth';

type ActiveRole = 'reader' | 'contributor' | 'screener' | 'reviewer' | 'admin';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeRole: ActiveRole;
  setActiveRole: (role: ActiveRole) => void;
  availableRoles: ActiveRole[];
  signup: (username: string, email: string, password: string, recaptchaResponse?: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_ROLE_STORAGE_KEY = 'wt_active_role';

function isActiveRole(value: unknown): value is ActiveRole {
  return ['reader', 'contributor', 'screener', 'reviewer', 'admin'].includes(String(value || ''));
}

function getAvailableRolesForUser(user: User | null): ActiveRole[] {
  const roles: ActiveRole[] = ['reader', 'contributor'];
  if (user?.roles?.screener) roles.push('screener');
  if (user?.roles?.reviewer) roles.push('reviewer');
  if (user?.roles?.admin) roles.push('admin');
  return roles;
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRole, setActiveRoleState] = useState<ActiveRole>(() => {
    try {
      const stored = localStorage.getItem(AUTH_ROLE_STORAGE_KEY);
      if (isActiveRole(stored)) {
        return stored;
      }
    } catch { /* ignore */ }
    return 'contributor';
  });

  const availableRoles: ActiveRole[] = useMemo(() => getAvailableRolesForUser(user), [user]);

  const setActiveRole = useCallback((role: ActiveRole) => {
    setActiveRoleState(role);
    try {
      localStorage.setItem(AUTH_ROLE_STORAGE_KEY, role);
    } catch {
      // ignore storage failures
    }
    if (user) {
      void authApi.roleSwitch(role).catch((error) => {
        console.error('Role switch sync failed:', error);
      });
    }
  }, [user]);

  useEffect(() => {
    // Check if user is already logged in on mount
    void checkAuthStatus();
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await authApi.me();
      const resolvedUser = response.user || null;
      setUser(resolvedUser);
      const allowedRoles = getAvailableRolesForUser(resolvedUser);
      const storedRole = (() => {
        try {
          return localStorage.getItem(AUTH_ROLE_STORAGE_KEY);
        } catch {
          return null;
        }
      })();
      const normalizedServerRole = isActiveRole(response.activeRole) ? response.activeRole : null;
      const nextRole: ActiveRole = (normalizedServerRole && allowedRoles.includes(normalizedServerRole))
        ? normalizedServerRole
        : (storedRole && isActiveRole(storedRole) && allowedRoles.includes(storedRole) ? storedRole : 'contributor');
      setActiveRoleState(nextRole);
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const data = await authApi.login({ username, password });
      const resolvedUser = data.user || null;
      setUser(resolvedUser);
      const allowedRoles = getAvailableRolesForUser(resolvedUser);
      const serverRole = isActiveRole(data.activeRole) ? data.activeRole : null;
      const nextRole: ActiveRole =
        serverRole && allowedRoles.includes(serverRole) ? serverRole : 'contributor';
      setActiveRoleState(nextRole);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);

  const signup = useCallback(async (username: string, email: string, password: string, recaptchaResponse?: string) => {
    try {
      const data = await authApi.signup({ username, email, password, recaptchaResponse });
      const resolvedUser = data.user || null;
      setUser(resolvedUser);
      const allowedRoles = getAvailableRolesForUser(resolvedUser);
      const serverRole = isActiveRole(data.activeRole) ? data.activeRole : null;
      const nextRole: ActiveRole =
        serverRole && allowedRoles.includes(serverRole) ? serverRole : 'contributor';
      setActiveRoleState(nextRole);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }, []);

  const updateUser = useCallback((userData: Partial<User>) => {
    setUser((current) => (current ? { ...current, ...userData } : current));
  }, []);

  const value: AuthContextType = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    activeRole,
    setActiveRole,
    availableRoles,
    signup,
    login,
    logout,
    updateUser,
  }), [user, isLoading, activeRole, setActiveRole, availableRoles]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
