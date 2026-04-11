import React, { useCallback, useEffect, useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import ContextSidebar from './ContextSidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    if (!sidebarOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSidebar();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [sidebarOpen, closeSidebar]);

  return (
    <div>
      <Header />
      <div className="container-fluid">
        <div className={`row row-offcanvas row-offcanvas-right${sidebarOpen ? ' active' : ''}`}>
          <div className="col-sm-12 col-md-9 col-lg-9-x">
            <button
              type="button"
              className="btn btn-default btn-xs visible-xs visible-sm"
              style={{ marginBottom: '10px' }}
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle sidebar"
            >
              <i className="fa fa-bars" aria-hidden="true"></i> {sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
            </button>
            {children}
          </div>

          {sidebarOpen && (
            <div
              className="sidebar-backdrop visible-xs visible-sm"
              onClick={closeSidebar}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.4)',
                zIndex: 999,
              }}
            />
          )}

          <div
            className="col-xs-7-x col-sm-4 col-md-3 col-lg-3-x visible-md visible-lg sidebar-offcanvas"
            id="sidebar"
            style={sidebarOpen ? { display: 'block', zIndex: 1000, position: 'relative' } : undefined}
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
