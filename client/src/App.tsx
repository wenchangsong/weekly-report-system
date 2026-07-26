import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { ToastContainer } from './components/ui/Toast';
import { Spinner } from './components/ui/Spinner';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ReportListPage from './pages/ReportListPage';
import ReportNewPage from './pages/ReportNewPage';
import ReportDetailPage from './pages/ReportDetailPage';
import ReportEditPage from './pages/ReportEditPage';
import TeamPage from './pages/TeamPage';
import TeamListPage from './pages/TeamListPage';
import TeamDetailPage from './pages/TeamDetailPage';
import AdminTeamsPage from './pages/AdminTeamsPage';
import AdminRemindersPage from './pages/AdminRemindersPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    loadFromStorage();
  }, []);

  if (isLoading) {
    return <Spinner fullScreen />;
  }

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/reports" element={<ReportListPage />} />
            <Route path="/reports/new" element={<ReportNewPage />} />
            <Route path="/reports/:id" element={<ReportDetailPage />} />
            <Route path="/reports/:id/edit" element={<ReportEditPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/teams" element={<TeamListPage />} />
            <Route path="/teams/:id" element={<TeamDetailPage />} />
            <Route path="/admin/teams" element={<AdminTeamsPage />} />
            <Route path="/admin/reminders" element={<AdminRemindersPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
