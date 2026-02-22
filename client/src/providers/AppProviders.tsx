import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import { UserProvider } from '../context/UserContext';
import { ThemeProvider } from '../context/ThemeContext';

interface AppProvidersProps {
  children: React.ReactNode;
}

const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ThemeProvider>
      <UserProvider>
        <AuthProvider>{children}</AuthProvider>
      </UserProvider>
    </ThemeProvider>
  );
};

export default AppProviders;
