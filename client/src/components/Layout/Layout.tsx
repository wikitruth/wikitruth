import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ContextSidebar from './ContextSidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((value) => !value), []);

  useEffect(() => {
    if (!sidebarOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSidebar();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [sidebarOpen, closeSidebar]);

  useEffect(() => {
    closeSidebar();
  }, [location.pathname, location.search, closeSidebar]);

  return (
    <div>
      <Header onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
      <div className="container-fluid">
        {sidebarOpen ? (
          <button
            type="button"
            className="sidebar-backdrop visible-xs visible-sm"
            aria-label="Close sidebar"
            onClick={closeSidebar}
          />
        ) : null}
        <div className={`row row-offcanvas row-offcanvas-right${sidebarOpen ? ' active' : ''}`}>
          <div className="col-sm-12 col-md-9 col-lg-9-x">
            {children}
          </div>

          <div
            className="col-xs-7-x col-sm-4 col-md-3 col-lg-3-x sidebar-offcanvas"
            id="sidebar"
          >
            <ContextSidebar />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Layout;
