import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import OptimizedImage from '../common/OptimizedImage';

const Header: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    // TODO: Fetch user and application data from API
    // For now, this is a placeholder
  }, []);

  return (
    <div className="navbar navbar-default navbar-fixed-top">
      <div className="container-fluid">
        <div className="navbar-header">
          <Link to="/" className="navbar-brand">
            <OptimizedImage
              src={application?.logoIcon || '/img/logo-64x64.png'}
              alt="Logo"
              width={32}
              height={32}
              className="navbar-logo"
            />
            <span className="navbar-brand-label">
              <span className="hidden-xxs">Wikitruth</span>
            </span>
          </Link>
        </div>
        <div className="navbar-collapse my-navbar-collapse collapse">
          <nav aria-label="Primary navigation">
            <ul className="nav navbar-nav">
              <li>
                <Link to="/topics" title="Explore" aria-label="Explore topics">
                  <i className="fa fa-globe"></i>
                  <span className="hidden-xs"> Explore</span>
                </Link>
              </li>
              <li>
                <Link to="/search" title="Search" aria-label="Search content">
                  <i className="fa fa-search"></i>
                  <span className="hidden-xs"> Search</span>
                </Link>
              </li>
              <li className={`dropdown ${isMoreOpen ? 'open' : ''}`}>
                <button
                  type="button"
                  title="More"
                  className="dropdown-toggle btn btn-link navbar-btn"
                  aria-haspopup="true"
                  aria-expanded={isMoreOpen}
                  aria-controls="header-more-menu"
                  onClick={() => setIsMoreOpen((value) => !value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      setIsMoreOpen(false);
                    }
                  }}
                >
                  <span className="glyphicon glyphicon-option-horizontal" aria-hidden="true"></span>
                </button>
                <ul id="header-more-menu" className="dropdown-menu dropdown-menu-right">
                  <li className="dropdown-header">more</li>
                  <li>
                    <Link to="/groups" onClick={() => setIsMoreOpen(false)}>
                      <i className="fa fa-group"></i> Groups
                    </Link>
                  </li>
                  <li>
                    <Link to="/members" onClick={() => setIsMoreOpen(false)}>
                      <i className="fa fa-user-circle"></i> Members
                    </Link>
                  </li>
                </ul>
              </li>
            </ul>
          </nav>
          <nav aria-label="Account navigation">
            <ul className="nav navbar-nav navbar-right">
            {user ? (
              <>
                <li>
                  <button type="button" title="Notifications" className="btn btn-link navbar-btn">
                    <i className="fa fa-bell-o"></i>
                  </button>
                </li>
                <li className={`dropdown ${isUserMenuOpen ? 'open' : ''}`}>
                  <button
                    type="button"
                    className="dropdown-toggle"
                    style={{ background: 'transparent', border: 0 }}
                    aria-haspopup="true"
                    aria-expanded={isUserMenuOpen}
                    aria-controls="header-user-menu"
                    onClick={() => setIsUserMenuOpen((value) => !value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        setIsUserMenuOpen(false);
                      }
                    }}
                  >
                    <span className="hidden-xxs-x">
                      <i className="fa fa-user-circle"></i>{' '}
                      <span className="hidden-xxs">{user.username} </span>
                      <span className="caret"></span>
                    </span>
                  </button>
                  <ul id="header-user-menu" className="dropdown-menu dropdown-menu-right">
                    <li className="dropdown-header">Account</li>
                    <li>
                      <Link to={`/members/${user.username}`} onClick={() => setIsUserMenuOpen(false)}>
                        <i className="fa fa-user-circle"></i> My Profile
                      </Link>
                    </li>
                    <li>
                      <Link to={`/members/${user.username}/diary`} onClick={() => setIsUserMenuOpen(false)}>
                        <i className="fa fa-folder-open"></i> My Diary
                      </Link>
                    </li>
                    <li role="separator" className="divider"></li>
                    <li>
                      <a href="/logout">
                        <i className="fa fa-sign-out"></i> Sign Out
                      </a>
                    </li>
                  </ul>
                </li>
              </>
            ) : (
              <li>
                <a href="/login" className="nav-narrow" aria-label="Sign in">
                  <i className="fa fa-user"></i>
                  <span className="hidden-xxxxs"> Sign In</span>
                </a>
              </li>
            )}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Header;
