import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CasesPage } from './pages/CasesPage';
import { EvidencePage } from './pages/EvidencePage';
import { TimelinePage } from './pages/TimelinePage';
import { GraphPage } from './pages/GraphPage';
import { FindingsPage } from './pages/FindingsPage';
import { RiskPage } from './pages/RiskPage';
import { IntegrityPage } from './pages/IntegrityPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ExplainabilityPage } from './pages/ExplainabilityPage';
import { AuditPage } from './pages/AuditPage';
import { CaseComparePage } from './pages/CaseComparePage';
import { ForensicInvestigationPage } from './pages/ForensicInvestigationPage';
import { IntroPage } from './pages/IntroPage';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useApp();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Public Route Wrapper (redirects to dashboard if already logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useApp();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

export function AppRoutes() {
  return (
    <Routes>
      {/* Intro / Landing Page as Initial Route */}
      <Route path="/" element={<IntroPage />} />
      <Route path="/intro" element={<IntroPage />} />

      {/* Public Login Route */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Protected App Routes inside AppLayout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="forensic-access" element={<ForensicInvestigationPage />} />
        <Route path="investigate" element={<ForensicInvestigationPage />} />
        <Route path="cases" element={<CasesPage />} />
        <Route path="evidence" element={<EvidencePage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="graph" element={<GraphPage />} />
        <Route path="findings" element={<FindingsPage />} />
        <Route path="risk" element={<RiskPage />} />
        <Route path="explainability" element={<ExplainabilityPage />} />
        <Route path="compare" element={<CaseComparePage />} />
        <Route path="integrity" element={<IntegrityPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
