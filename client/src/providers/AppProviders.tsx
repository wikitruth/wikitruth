import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '../context/AuthContext';
import { UserProvider } from '../context/UserContext';
import { ThemeProvider } from '../context/ThemeContext';
import { NotificationProvider } from '../context/NotificationContext';
import ToastContainer from '../components/common/ToastContainer';
import '../styles/print.css';

interface AppProvidersProps {
  children: React.ReactNode;
}

const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <NotificationProvider>
          <UserProvider>
            <AuthProvider>
              {children}
              <ToastContainer />
            </AuthProvider>
          </UserProvider>
        </NotificationProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
};

export default AppProviders;
