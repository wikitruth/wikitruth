import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import OptimizedImage from '../common/OptimizedImage';
import ApplicationLink from '../common/ApplicationLink';
import { useAuth } from '../../context/AuthContext';
import { useApplicationContext } from '../../context/ApplicationContext';
import notificationsApi from '../../services/api/notifications';
import { toModernAppSectionUrl } from '../../utils/paths';

interface HeaderSection {
  title: string;
  description?: string;
  iconClass?: string;
  url?: string;
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

const DEFAULT_SECTIONS: HeaderSection[] = [
  {
    title: 'Debates',
    iconClass: 'fa fa-commenting',
    url: '/topics/entry/debates-discussions',
  },
  {
    title: 'Dictionary',
    iconClass: 'glyphicon glyphicon-font',
    url: '/topics/entry/dictionary',
  },
  {
    title: 'Manuscripts',
    iconClass: 'fa fa-book',
    url: '/topics/entry/sacred-texts',
  },
];

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, sidebarOpen = false }) => {
  const location = useLocation();
  const { user, activeRole, setActiveRole, availableRoles } = useAuth();
  const { application, applicationPath } = useApplicationContext();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const headerSections: HeaderSection[] = application?.sections?.length
    ? application.sections
    : DEFAULT_SECTIONS;

  useEffect(() => {
    let isMounted = true;

    if (!user) {
      setUnreadNotifications(0);
    } else {
      void notificationsApi.summary()
        .then((summary) => {
          if (isMounted) setUnreadNotifications(Number(summary.unreadCount || 0));
        })
        .catch(() => {
          if (isMounted) setUnreadNotifications(0);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    setIsMoreOpen(false);
    setIsUserMenuOpen(false);
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="navbar navbar-default navbar-fixed-top">
      <div className="container-fluid">
        <div className="navbar-header">
          <ApplicationLink href={application?.homeUrl || '/'} className="navbar-brand">
            <OptimizedImage
              src={application?.logoIcon || '/img/logo-64x64.png'}
              alt="Logo"
              width={32}
              height={32}
              className="navbar-logo"
            />
            <span className="navbar-brand-label">
              <span className="hidden-xxs">{application?.navTitle || application?.name || application?.title || 'Wikitruth'}</span>
            </span>
          </ApplicationLink>
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
                <ApplicationLink
                  href={applicationPath(application?.exploreUrl || '/explore')}
                  title="Explore"
                  aria-label="Explore topics"
                  onClick={() => setIsMobileNavOpen(false)}
                >
                  <i className="fa fa-globe"></i>
                  <span className="hidden-xs"> Explore</span>
                </ApplicationLink>
              </li>
              <li>
                <Link
                  to={applicationPath('/search')}
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
                  {!user ? (
                    <li className="visible-xs">
                      <Link to={applicationPath('/contribute')} onClick={() => {
                        setIsMoreOpen(false);
                        setIsMobileNavOpen(false);
                      }}>
                        <i className="fa fa-user-secret"></i> Contribute anonymously
                      </Link>
                    </li>
                  ) : null}
                  <li>
                    <Link to={applicationPath('/create')} onClick={() => {
                      setIsMoreOpen(false);
                      setIsMobileNavOpen(false);
                    }}>
                      <i className="fa fa-plus-circle"></i> Create
                    </Link>
                  </li>
                  <li>
                    <Link to={applicationPath('/groups')} onClick={() => {
                      setIsMoreOpen(false);
                      setIsMobileNavOpen(false);
                    }}>
                      <i className="fa fa-group"></i> Groups
                    </Link>
                  </li>
                  <li>
                    <Link to={applicationPath('/members')} onClick={() => {
                      setIsMoreOpen(false);
                      setIsMobileNavOpen(false);
                    }}>
                      <i className="fa fa-user-circle"></i> Members
                    </Link>
                  </li>
                  <li className="divider" aria-hidden="true"></li>
                  {headerSections.map((section) => (
                    <li key={`${section.title}-${section.url || ''}`}>
                      <ApplicationLink
                        href={applicationPath(toModernAppSectionUrl(section.url))}
                        title={section.description}
                        onClick={() => {
                          setIsMoreOpen(false);
                          setIsMobileNavOpen(false);
                        }}
                      >
                        <i className={section.iconClass || 'fa fa-folder-open'} aria-hidden="true"></i>{' '}
                        {section.title}
                      </ApplicationLink>
                    </li>
                  ))}
                  <li className="divider" aria-hidden="true"></li>
                  <li>
                    <ApplicationLink href={applicationPath(toModernAppSectionUrl(application?.aboutUrl || '/about'))} onClick={() => {
                      setIsMoreOpen(false);
                      setIsMobileNavOpen(false);
                    }}>
                      <i className="fa fa-info-circle"></i> About
                    </ApplicationLink>
                  </li>
                  <li>
                    <Link to={applicationPath('/contact')} onClick={() => {
                      setIsMoreOpen(false);
                      setIsMobileNavOpen(false);
                    }}>
                      <i className="fa fa-comment"></i> Contact
                    </Link>
                  </li>
                  <li role="separator" className="divider" aria-hidden="true"></li>
                  <li>
                    <a
                      href="/legacy/"
                      onClick={() => {
                        setIsMoreOpen(false);
                        setIsMobileNavOpen(false);
                      }}
                    >
                      <i className="fa fa-history"></i> Legacy UX
                    </a>
                  </li>
                </ul>
              </li>
            </ul>
          </nav>
          <nav aria-label="Account navigation">
            <ul className="nav navbar-nav navbar-right wt-account-nav">
            {user ? (
              <>
                <li>
                  <Link to={applicationPath('/notifications')} title="Notifications" aria-label="Notifications">
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
                    className="dropdown-toggle wt-navbar-control"
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
                      <Link to={applicationPath(`/members/${user.username}`)} onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsMobileNavOpen(false);
                      }}>
                        <i className="fa fa-user-circle"></i> My Profile
                      </Link>
                    </li>
                      <li>
                        <Link to={applicationPath(`/members/${user.username}/journal`)} onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsMobileNavOpen(false);
                        }}>
                          <i className="fa fa-folder-open"></i> My Journal
                        </Link>
                      </li>
                      {Boolean(user.roles?.admin) && (
                        <li>
                          <Link to={applicationPath('/admin')} onClick={() => {
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
                        <Link to={applicationPath('/logout')} onClick={() => {
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
              <>
                <li className="hidden-xs">
                  <Link to={applicationPath('/contribute')} className="nav-narrow" aria-label="Contribute anonymously">
                    <i className="fa fa-user-secret"></i>
                    <span className="hidden-xs"> Contribute</span>
                  </Link>
                </li>
                <li>
                  <Link to={applicationPath('/login')} className="nav-narrow" aria-label="Sign in">
                    <i className="fa fa-user"></i>
                    <span className="hidden-xxxxs"> Sign In</span>
                  </Link>
                </li>
              </>
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
