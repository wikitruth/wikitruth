import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { User } from '../types';
import authApi from '../services/api/auth';

type ActiveRole = 'contributor' | 'screener' | 'reviewer' | 'admin';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeRole: ActiveRole;
  setActiveRole: (role: ActiveRole) => void;
  availableRoles: ActiveRole[];
  signup: (username: string, email: string, password: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRole, setActiveRoleState] = useState<ActiveRole>(() => {
    try {
      const stored = localStorage.getItem('wt_active_role');
      if (stored && ['contributor', 'screener', 'reviewer', 'admin'].includes(stored)) {
        return stored as ActiveRole;
      }
    } catch { /* ignore */ }
    return 'contributor';
  });

  const setActiveRole = useCallback((role: ActiveRole) => {
    setActiveRoleState(role);
    try { localStorage.setItem('wt_active_role', role); } catch { /* ignore */ }
  }, []);

  const availableRoles: ActiveRole[] = React.useMemo(() => {
    const roles: ActiveRole[] = ['contributor'];
    if (user?.roles?.screener) roles.push('screener');
    if (user?.roles?.reviewer) roles.push('reviewer');
    if (user?.roles?.admin) roles.push('admin');
    return roles;
  }, [user]);

  useEffect(() => {
    // Check if user is already logged in on mount
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await authApi.me();
      setUser(response.user || null);
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const data = await authApi.login({ username, password });
      setUser(data.user || null);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (username: string, email: string, password: string) => {
    try {
      const data = await authApi.signup({ username, email, password });
      setUser(data.user || null);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

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
