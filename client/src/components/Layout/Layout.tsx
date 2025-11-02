import React from 'react';
import Header from './Header';
import Footer from './Footer';

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
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Layout;
