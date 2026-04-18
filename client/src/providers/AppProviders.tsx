import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { NotificationProvider } from '../context/NotificationContext';
import ToastContainer from '../components/common/ToastContainer';
import '../styles/print.css';
import '../styles/layout-mobile.css';

interface AppProvidersProps {
  children: React.ReactNode;
}

const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  const recaptchaSiteKey =
    typeof process !== 'undefined'
      ? String(process.env.REACT_APP_RECAPTCHA_SITE_KEY || '').trim()
      : '';

  const appTree = (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          {children}
          <ToastContainer />
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );

  return (
    <HelmetProvider>
      {recaptchaSiteKey ? (
        <GoogleReCaptchaProvider
          reCaptchaKey={recaptchaSiteKey}
          scriptProps={{ async: true, defer: true, appendTo: 'head' }}
        >
          {appTree}
        </GoogleReCaptchaProvider>
      ) : (
        appTree
      )}
    </HelmetProvider>
  );
};

export default AppProviders;
