import React, { Suspense, useEffect, useCallback, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';
import MainLayout from './components/Layout/MainLayout';
import { appRoutes } from './routes/routeConfig';
import { APP_BASE_PATH } from './utils/constants';
import { initAnalytics, trackPageView } from './utils/analytics';

const RouteTracker: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const normalizedKey = String(e.key || '').toLowerCase();
    const isSearchShortcut = normalizedKey === 'k' || e.code === 'KeyK';

    // Ctrl+K or Cmd+K to focus search
    if ((e.ctrlKey || e.metaKey) && isSearchShortcut) {
      e.preventDefault();
      navigate('/search');
      return;
    }
    // Escape to close help dialog
    if (e.key === 'Escape' && showShortcutHelp) {
      setShowShortcutHelp(false);
      return;
    }
    // Skip remaining shortcuts when typing in input fields
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
    if ((e.target as HTMLElement)?.isContentEditable) return;
    // "/" to focus search (only when not typing in an input)
    if (e.key === '/') {
      e.preventDefault();
      navigate('/search');
      return;
    }
    // "?" to toggle keyboard shortcut help
    if (e.key === '?') {
      e.preventDefault();
      setShowShortcutHelp((prev) => !prev);
    }
  }, [navigate, showShortcutHelp]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!showShortcutHelp) return null;

  return (
    <div
      className="modal"
      style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={() => setShowShortcutHelp(false)}
      role="dialog"
      aria-label="Keyboard shortcuts"
    >
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <button type="button" className="close" onClick={() => setShowShortcutHelp(false)} aria-label="Close">
              &times;
            </button>
            <h4 className="modal-title">
              <i className="fa fa-keyboard-o"></i> Keyboard Shortcuts
            </h4>
          </div>
          <div className="modal-body">
            <table className="table table-condensed">
              <tbody>
                <tr>
                  <td><kbd>/</kbd></td>
                  <td>Focus search</td>
                </tr>
                <tr>
                  <td><kbd>Ctrl</kbd>+<kbd>K</kbd></td>
                  <td>Focus search</td>
                </tr>
                <tr>
                  <td><kbd>?</kbd></td>
                  <td>Show this help</td>
                </tr>
                <tr>
                  <td><kbd>Esc</kbd></td>
                  <td>Close dialog / Clear search</td>
                </tr>
                <tr>
                  <td><kbd>↑</kbd> <kbd>↓</kbd></td>
                  <td>Navigate search results</td>
                </tr>
                <tr>
                  <td><kbd>Enter</kbd></td>
                  <td>Open selected result</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    initAnalytics();
  }, []);

  const resolvedBasePath =
    typeof window !== 'undefined' &&
    (window.location.pathname === APP_BASE_PATH || window.location.pathname.startsWith(`${APP_BASE_PATH}/`))
      ? APP_BASE_PATH
      : '';

  return (
    <Router basename={resolvedBasePath}>
      <RouteTracker />
      <MainLayout>
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {appRoutes.map((route) => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </MainLayout>
    </Router>
  );
};

export default App;
