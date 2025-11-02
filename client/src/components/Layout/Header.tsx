import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);

  useEffect(() => {
    // TODO: Fetch user and application data from API
    // For now, this is a placeholder
  }, []);

  return (
    <div className="navbar navbar-default navbar-fixed-top">
      <div className="container-fluid">
        <div className="navbar-header">
          <Link to="/" className="navbar-brand">
            <img
              src={application?.logoIcon || '/img/logo-64x64.png'}
              alt="Logo"
              className="navbar-logo"
            />
            <span className="navbar-brand-label">
              <span className="hidden-xxs">Wikitruth</span>
            </span>
          </Link>
        </div>
        <div className="navbar-collapse my-navbar-collapse collapse">
          <ul className="nav navbar-nav">
            <li>
              <Link to="/topics" title="Explore">
                <i className="fa fa-globe"></i>
                <span className="hidden-xs"> Explore</span>
              </Link>
            </li>
            <li>
              <Link to="/search" title="Search">
                <i className="fa fa-search"></i>
                <span className="hidden-xs"> Search</span>
              </Link>
            </li>
            <li className="dropdown">
              <a
                href="#"
                title="more"
                className="dropdown-toggle"
                data-toggle="dropdown"
                role="button"
                aria-haspopup="true"
                aria-expanded="false"
              >
                <span className="glyphicon glyphicon-option-horizontal" aria-hidden="true"></span>
              </a>
              <ul className="dropdown-menu dropdown-menu-right">
                <li className="dropdown-header">more</li>
                <li>
                  <Link to="/groups">
                    <i className="fa fa-group"></i> Groups
                  </Link>
                </li>
                <li>
                  <Link to="/members">
                    <i className="fa fa-user-circle"></i> Members
                  </Link>
                </li>
              </ul>
            </li>
          </ul>
          <ul className="nav navbar-nav navbar-right">
            {user ? (
              <>
                <li>
                  <a href="#" title="Notifications">
                    <i className="fa fa-bell-o"></i>
                  </a>
                </li>
                <li className="dropdown">
                  <a
                    href="#"
                    className="dropdown-toggle"
                    data-toggle="dropdown"
                    role="button"
                    aria-haspopup="true"
                    aria-expanded="false"
                  >
                    <span className="hidden-xxs-x">
                      <i className="fa fa-user-circle"></i>{' '}
                      <span className="hidden-xxs">{user.username} </span>
                      <span className="caret"></span>
                    </span>
                  </a>
                  <ul className="dropdown-menu dropdown-menu-right">
                    <li className="dropdown-header">Account</li>
                    <li>
                      <Link to={`/members/${user.username}`}>
                        <i className="fa fa-user-circle"></i> My Profile
                      </Link>
                    </li>
                    <li>
                      <Link to={`/members/${user.username}/diary`}>
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
                <a href="/login" className="nav-narrow">
                  <i className="fa fa-user"></i>
                  <span className="hidden-xxxxs"> Sign In</span>
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Header;
