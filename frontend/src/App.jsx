import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SessionsPage from './pages/SessionsPage';
import SpotsPage from './pages/SpotsPage';
import ReportsPage from './pages/ReportsPage';
import AdminPage from './pages/AdminPage';
import VehiclesPage from './pages/VehiclesPage';

const PrivateRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <div className="loader loader-lg" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="spots" element={<SpotsPage />} />
        <Route path="vehicles" element={<VehiclesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="admin" element={<PrivateRoute roles={['admin']}><AdminPage /></PrivateRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1a1a28', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.07)', fontFamily: 'DM Sans, sans-serif' },
            success: { iconTheme: { primary: '#22c55e', secondary: '#0a0a0f' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#0a0a0f' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
