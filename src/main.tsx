
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import App from './App.tsx';

import './index.css';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      {/* Halaman utama */}
      <Route
        path="/"
        element={<Navigate to="/dashboard" replace />}
      />

      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={<App mode="DASHBOARD" />}
      />

      {/* Sessions */}
      <Route
        path="/sessions"
        element={<App mode="SESSIONS" />}
      />

      {/* Datasets */}
      <Route
        path="/datasets"
        element={<App mode="DATASETS" />}
      />

      {/* Statistics */}
      <Route
        path="/statistics"
        element={<App mode="STATISTICS" />}
      />

      {/* Chart Backtest */}
      <Route
        path="/chart/:sessionId"
        element={<App mode="CHART" />}
      />

      {/* Backtest */}
      <Route
        path="/backtest/:sessionId"
        element={<App mode="BACKTEST" />}
      />

      {/* Halaman tidak ditemukan */}
      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />
    </Routes>
  </BrowserRouter>
);
