import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import OptimizedImage from '../common/OptimizedImage';
import type { Application, User } from '../../types';
import { useAuth } from '../../context/AuthContext';
import authApi from '../../services/api/auth';
import apiService from '../../services/api';
import notificationsApi from '../../services/api/notifications';

type HeaderUser = Pick<User, '_id' | 'username' | 'email' | 'roles'>;
type HeaderApplication = Pick<Application, '_id'> & {
  name?: string;
  title?: string;
  logoIcon?: string;
};

interface HomePayload {
  application?: HeaderApplication;
}

interface HeaderProps {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  reader: 'Reader',
  contributor: 'Contributor',
  screener: 'Screener',
  reviewer: 'Reviewer',
  admin: 'Admin',
};

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, sidebarOpen = false }) => {
  const location = useLocation();
  const { activeRole, setActiveRole, availableRoles } = useAuth();
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [application, setApplication] = useState<HeaderApplication | null>(null);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadHeaderData = async () => {
      const [userResult, homeResult] = await Promise.allSettled([
        authApi.me(),
        apiService.getHomeData() as Promise<HomePayload>,
      ]);

      if (!isMounted) {
        return;
      }

      if (userResult.status === 'fulfilled' && userResult.value.user) {
        setUser({
          _id: userResult.value.user._id,
          username: userResult.value.user.username,
          email: userResult.value.user.email,
          roles: userResult.value.user.roles,
        });
      } else {
        setUser(null);
      }

      if (homeResult.status === 'fulfilled' && homeResult.value.application) {
        setApplication(homeResult.value.application);
      } else {
        setApplication(null);
      }

      if (userResult.status === 'fulfilled' && userResult.value.user) {
        try {
          const summary = await notificationsApi.summary();
          if (isMounted) {
            setUnreadNotifications(Number(summary.unreadCount || 0));
          }
        } catch (_error) {
          if (isMounted) {
            setUnreadNotifications(0);
          }
        }
      } else if (isMounted) {
        setUnreadNotifications(0);
      }
    };

    void loadHeaderData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setIsMoreOpen(false);
    setIsUserMenuOpen(false);
    setIsMobileNavOpen(false);
  }, [location.pathname]);

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
              <span className="hidden-xxs">{application?.name || application?.title || 'Wikitruth'}</span>
            </span>
          </Link>
          <button
            type="button"
            className="navbar-toggle collapsed"
            aria-label="Toggle navigation"
            aria-expanded={isMobileNavOpen}
            aria-controls="header-main-collapse"
            onClick={() => setIsMobileNavOpen((value) => !value)}
          >
            <span className="sr-only">Toggle navigation</span>
            <i className="fa fa-navicon" aria-hidden="true"></i>
          </button>
        </div>
        <div id="header-main-collapse" className={`navbar-collapse my-navbar-collapse collapse${isMobileNavOpen ? ' in' : ''}`}>
          <nav aria-label="Primary navigation">
            <ul className="nav navbar-nav">
              <li>
                <Link
                  to="/explore"
                  title="Explore"
                  aria-label="Explore topics"
                  onClick={() => setIsMobileNavOpen(false)}
                >
                  <i className="fa fa-globe"></i>
                  <span className="hidden-xs"> Explore</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/search"
                  title="Search"
                  aria-label="Search content"
                  onClick={() => setIsMobileNavOpen(false)}
                >
                  <i className="fa fa-search"></i>
                  <span className="hidden-xs"> Search</span>
                </Link>
              </li>
              <li className={`dropdown ${isMoreOpen ? 'open' : ''}`}>
                <button
                  type="button"
                  title="more"
                  className="dropdown-toggle btn btn-link navbar-btn"
                  aria-label="More navigation options"
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
                    <Link to="/create" onClick={() => {
                      setIsMoreOpen(false);
                      setIsMobileNavOpen(false);
                    }}>
                      <i className="fa fa-plus-circle"></i> Create
                    </Link>
                  </li>
                  <li>
                    <Link to="/groups" onClick={() => {
                      setIsMoreOpen(false);
                      setIsMobileNavOpen(false);
                    }}>
                      <i className="fa fa-group"></i> Groups
                    </Link>
                  </li>
                  <li>
                    <Link to="/members" onClick={() => {
                      setIsMoreOpen(false);
                      setIsMobileNavOpen(false);
                    }}>
                      <i className="fa fa-user-circle"></i> Members
                    </Link>
                  </li>
                  <li className="divider" aria-hidden="true"></li>
                  <li>
                    <Link to="/about" onClick={() => {
                      setIsMoreOpen(false);
                      setIsMobileNavOpen(false);
                    }}>
                      <i className="fa fa-info-circle"></i> About
                    </Link>
                  </li>
                  <li>
                    <Link to="/contact" onClick={() => {
                      setIsMoreOpen(false);
                      setIsMobileNavOpen(false);
                    }}>
                      <i className="fa fa-comment"></i> Contact
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
                  <Link to="/notifications" title="Notifications" className="btn btn-link navbar-btn" aria-label="Notifications">
                    <i className="fa fa-bell-o"></i>
                    {unreadNotifications > 0 ? (
                      <span className="badge" style={{ marginLeft: 6, background: '#d9534f' }}>
                        {unreadNotifications > 99 ? '99+' : unreadNotifications}
                      </span>
                    ) : null}
                  </Link>
                </li>
                <li className={`dropdown ${isUserMenuOpen ? 'open' : ''}`}>
                  <button
                    type="button"
                    className="dropdown-toggle"
                    style={{ background: 'transparent', border: 0 }}
                    aria-label={`Account menu for ${user.username}`}
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
                      <Link to={`/members/${user.username}`} onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsMobileNavOpen(false);
                      }}>
                        <i className="fa fa-user-circle"></i> My Profile
                      </Link>
                    </li>
                      <li>
                        <Link to={`/members/${user.username}/diary`} onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsMobileNavOpen(false);
                        }}>
                          <i className="fa fa-folder-open"></i> My Diary
                        </Link>
                      </li>
                      {Boolean(user.roles?.admin) && (
                        <li>
                          <Link to="/admin" onClick={() => {
                            setIsUserMenuOpen(false);
                            setIsMobileNavOpen(false);
                          }}>
                            <i className="fa fa-gear"></i> Admin Area
                          </Link>
                        </li>
                      )}
                      {availableRoles.length > 1 && (
                        <>
                          <li className="divider" aria-hidden="true"></li>
                          <li className="dropdown-header">Switch Role</li>
                          {availableRoles.map((role) => (
                            <li key={role}>
                              <button
                                type="button"
                                className="btn btn-link"
                                style={{ width: '100%', textAlign: 'left', padding: '3px 20px' }}
                                onClick={() => {
                                  setActiveRole(role);
                                  setIsUserMenuOpen(false);
                                  setIsMobileNavOpen(false);
                                }}
                              >
                                <i className={`fa ${activeRole === role ? 'fa-check-circle' : 'fa-circle-o'}`}></i>{' '}
                                {ROLE_LABELS[role] || role}
                              </button>
                            </li>
                          ))}
                        </>
                      )}
                      <li className="divider" aria-hidden="true"></li>
                      <li>
                        <Link to="/logout" onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsMobileNavOpen(false);
                        }}>
                          <i className="fa fa-sign-out"></i> Sign Out
                        </Link>
                      </li>
                    </ul>
                </li>
              </>
            ) : (
              <li>
                <Link to="/login" className="nav-narrow" aria-label="Sign in">
                  <i className="fa fa-user"></i>
                  <span className="hidden-xxxxs"> Sign In</span>
                </Link>
              </li>
            )}
              <li className="dropdown visible-sm visible-xs">
                <button
                  type="button"
                  className="dropdown-toggle btn btn-link navbar-btn"
                  aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                  aria-expanded={sidebarOpen}
                  aria-controls="sidebar"
                  onClick={(event) => {
                    event.preventDefault();
                    setIsMobileNavOpen(false);
                    onToggleSidebar?.();
                  }}
                  style={{ color: '#777' }}
                >
                  <i className="fa fa-navicon" aria-hidden="true"></i>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Header;
