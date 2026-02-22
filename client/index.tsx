import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App';
import { startPerformanceMonitoring } from './src/utils/performance';
import './src/styles/index.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

startPerformanceMonitoring();
