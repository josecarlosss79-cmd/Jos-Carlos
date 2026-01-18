
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Checklist from './pages/Checklist';
import Assets from './pages/Assets';
import Scanner from './pages/Scanner';
import Reports from './pages/Reports';
import Orders from './pages/Orders';
import WorkSchedule from './pages/WorkSchedule';
import Security from './pages/Security';
import Stock from './pages/Stock';
import { isMobile } from './services/device';
import { getUserRole } from './services/storage';
import { UserRole } from './types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const role = getUserRole();
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  const [mobile, setMobile] = useState(isMobile());

  useEffect(() => {
    const handleResize = () => setMobile(isMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Router>
      <div className={`flex min-h-screen bg-slate-50 ${mobile ? 'flex-col' : ''}`}>
        <Sidebar />
        <main className={`flex-1 min-h-screen ${mobile ? 'mb-16' : 'ml-64'}`}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/checklist" element={<Checklist />} />
            <Route path="/scanner" element={<Scanner />} />
            <Route path="/orders" element={<Orders />} />
            
            {/* Rotas Protegidas para Manager e Admin */}
            <Route path="/assets" element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
                <Assets />
              </ProtectedRoute>
            } />
            <Route path="/work-schedule" element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
                <WorkSchedule />
              </ProtectedRoute>
            } />
            <Route path="/stock" element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
                <Stock />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
                <Reports />
              </ProtectedRoute>
            } />
            
            {/* Rota Exclusiva para Admin */}
            <Route path="/security" element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                <Security />
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
