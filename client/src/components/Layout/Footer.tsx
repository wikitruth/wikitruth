import React from 'react';
import { Link } from 'react-router-dom';
import { useApplicationContext } from '../../context/ApplicationContext';
import ApplicationLink from '../common/ApplicationLink';
import { toModernAppSectionUrl } from '../../utils/paths';

const Footer: React.FC = () => {
  const year = new Date().getFullYear();
  const { application, applicationPath } = useApplicationContext();

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
              <span className="hidden-xxs"> Github</span>
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
        <div className="clearfix"></div>
      </div>
    </div>
  );
};

export default Footer;
