import React from 'react';
import { Link } from 'react-router-dom';
import { useApplicationContext } from '../../context/ApplicationContext';
import ApplicationLink from '../common/ApplicationLink';
import { toModernAppSectionUrl } from '../../utils/paths';

interface FooterProps {
  compact?: boolean;
}

const Footer: React.FC<FooterProps> = ({ compact = false }) => {
  const year = new Date().getFullYear();
  const { application, applicationPath } = useApplicationContext();

  if (compact) {
    return (
      <footer className="footer wt-auth-footer">
        <div className="container-fluid wt-auth-footer-inner">
          <nav className="wt-auth-footer-links" aria-label="Wikitruth information">
            <ApplicationLink href={applicationPath(toModernAppSectionUrl(application?.aboutUrl || '/about'))}>
              About
            </ApplicationLink>
            <Link to={applicationPath('/contact')}>Contact</Link>
            <Link to={applicationPath('/policies')}>Policies</Link>
            <a href="https://github.com/wikitruth/wikitruth" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </nav>
          <span className="copyright">&copy; {year} Wikitruth</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="footer">
      <div className="container-fluid wt-standard-footer-inner">
        <nav aria-label="Wikitruth links">
          <ul className="links">
            <li>
              <ApplicationLink href={application?.homeUrl || '/'} className="no-underline">
                <i className="fa fa-home"></i>
                <span className="hidden-xxs"> Home</span>
              </ApplicationLink>
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
                <span className="hidden-xxs"> Source</span>
              </a>
            </li>
            <li>
              <a
                href="https://github.com/wikitruth/wikitruth/blob/develop/LICENSE"
                target="_blank"
                rel="noreferrer"
                className="no-underline"
              >
                <i className="fa fa-balance-scale"></i>
                <span className="hidden-xs"> License</span>
              </a>
            </li>
            <li>
              <ApplicationLink
                href={applicationPath(toModernAppSectionUrl(application?.aboutUrl || '/about'))}
                className="no-underline"
              >
                <i className="fa fa-info-circle"></i>
                <span className="hidden-xs"> About</span>
              </ApplicationLink>
            </li>
            <li>
              <Link to={applicationPath('/contact')} className="no-underline">
                <i className="fa fa-comment"></i>
                <span className="hidden-xs"> Contact</span>
              </Link>
            </li>
          </ul>
        </nav>
        <span className="copyright">
          &copy; {year}&nbsp;
          <a href="https://github.com/wikitruth" target="_blank" rel="noreferrer">
            Wikitruth <span className="hidden-xs">Foundation</span>
          </a>
        </span>
      </div>
    </footer>
  );
};

export default Footer;
