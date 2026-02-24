import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App';
import AppProviders from './src/providers/AppProviders';
import { initializeErrorTracking } from './src/utils/monitoring';
import { startPerformanceMonitoring } from './src/utils/performance';
import { registerPwa } from './src/utils/pwa';
import './src/styles/index.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>
);

startPerformanceMonitoring();
initializeErrorTracking();
void registerPwa();
