import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import { appRoutes } from './routes/routeConfig';

const App: React.FC = () => {
  return (
    <Router basename="/app">
      <MainLayout>
        <Routes>
          {appRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Routes>
      </MainLayout>
    </Router>
  );
};

export default App;
