import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import Header from './Header';
import Footer from './Footer';
import ContextSidebar from './ContextSidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const focusedAuthLayout = /\/(login|signup)\/?$/.test(location.pathname);
  const wideContentLayout = location.pathname === '/transparency';
  const hidesContextSidebar = focusedAuthLayout || wideContentLayout;

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
        onCloseSidebar={focusedAuthLayout ? undefined : closeSidebar}
        sidebarOpen={focusedAuthLayout ? false : sidebarOpen}
        focused={focusedAuthLayout}
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
              : wideContentLayout
                ? 'col-xs-12 wt-main-column wt-wide-content-column'
              : 'col-sm-12 col-md-9 col-lg-9-x wt-main-column'}>
              {children}
            </div>

            {!hidesContextSidebar ? (
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
      <Footer compact={focusedAuthLayout} />
    </div>
  );
};

export default Layout;
