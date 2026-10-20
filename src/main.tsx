
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/sessions" replace />} />
      <Route path="/sessions" element={<App mode="SESSIONS" />} />
      <Route path="/chart/:sessionId" element={<App mode="CHART" />} />
      <Route path="/backtest/:sessionId" element={<App mode="BACKTEST" />} />
      <Route path="*" element={<Navigate to="/sessions" replace />} />
    </Routes>
  </BrowserRouter>
);
