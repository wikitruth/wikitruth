import React from 'react';
import Layout from './Layout';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return <Layout>{children}</Layout>;
};

export default MainLayout;
