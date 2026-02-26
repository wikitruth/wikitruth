import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <div className="footer">
      <div className="container-fluid">
        <span className="copyright pull-right">
          &copy; {year}&nbsp;
          <a href="https://github.com/wikitruth" target="_blank" rel="noreferrer">
            Wikitruth <span className="hidden-xs">Foundation</span>
          </a>
        </span>
        <ul className="links">
          <li>
            <Link to="/" className="no-underline">
              <i className="fa fa-home"></i>
              <span className="hidden-xxs"> Home</span>
            </Link>
          </li>
          <li>
            <a href="https://www.facebook.com/wikitruth.project" className="no-underline" target="_blank" rel="noreferrer">
              <i className="fa fa-facebook-official"></i>
              <span className="hidden-xxs"> Facebook</span>
            </a>
          </li>
          <li>
            <a href="https://github.com/wikitruth/wikitruth" target="_blank" rel="noreferrer" className="no-underline">
              <i className="fa fa-github"></i>
              <span className="hidden-xxs"> Github</span>
            </a>
          </li>
          <li>
            <Link to="/about" className="no-underline">
              <i className="fa fa-info-circle"></i>
              <span className="hidden-xs"> About</span>
            </Link>
          </li>
          <li>
            <Link to="/contact" className="no-underline">
              <i className="fa fa-comment"></i>
              <span className="hidden-xs"> Contact</span>
            </Link>
          </li>
        </ul>
        <div className="clearfix"></div>
      </div>
    </div>
  );
};

export default Footer;
