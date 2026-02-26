import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoadingSpinner from './components/LoadingSpinner';
import MainLayout from './components/Layout/MainLayout';
import { appRoutes } from './routes/routeConfig';
import { APP_BASE_PATH } from './utils/constants';

const App: React.FC = () => {
  if (typeof window !== 'undefined' && window.location.pathname === '/') {
    window.location.replace(APP_BASE_PATH);
    return null;
  }

  return (
    <Router basename={APP_BASE_PATH}>
      <MainLayout>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {appRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
          </Routes>
        </Suspense>
      </MainLayout>
    </Router>
  );
};

export default App;
