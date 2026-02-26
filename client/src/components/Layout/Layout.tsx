import React from 'react';
import Header from './Header';
import Footer from './Footer';
import ContextSidebar from './ContextSidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div>
      <Header />
      <div className="container-fluid">
        <div className="row row-offcanvas row-offcanvas-right">
          <div className="col-sm-12 col-md-9 col-lg-9-x">
            {children}
          </div>
          <div
            className="col-xs-7-x col-sm-4 col-md-3 col-lg-3-x visible-md visible-lg sidebar-offcanvas"
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
