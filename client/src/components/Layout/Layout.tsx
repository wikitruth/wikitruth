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
  const focusedAuthLayout = /\/login\/?$/.test(location.pathname);

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
    <div className="wt-app-shell">
      <Header
        onToggleSidebar={focusedAuthLayout ? undefined : toggleSidebar}
        sidebarOpen={focusedAuthLayout ? false : sidebarOpen}
      />
      <main className="wt-app-main">
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
            <div className={focusedAuthLayout
              ? 'col-xs-12 wt-main-column'
              : 'col-sm-12 col-md-9 col-lg-9-x wt-main-column'}>
              {children}
            </div>

            {!focusedAuthLayout ? (
              <div
                className="col-xs-7-x col-sm-4 col-md-3 col-lg-3-x sidebar-offcanvas"
                id="sidebar"
              >
                <ContextSidebar />
              </div>
            ) : null}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
