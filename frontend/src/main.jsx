import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/Auth';
import { Landing, AuthPage, About } from './pages/Public';
import Workspace from './pages/Workspace';
import Shell from './layouts/Shell';
import LiveIndia from './pages/LiveIndia';
import './styles.css';
import AppStatus from './components/AppStatus';
import './pwa';
function Guard({ role }) {
  const { user, loading, sessionError, retrySession } = useAuth();
  if (loading) return <div className="loading">Loading NEXUS…</div>;
  if (sessionError)
    return (
      <div className="error-page">
        <h1>Reconnect to your workspace</h1>
        <p>{sessionError}</p>
        <button className="button primary" onClick={retrySession}>
          Try again
        </button>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/unauthorized" replace />;
  return <Shell />;
}
const routes = {
  CITIZEN: ['live', 'dashboard', 'report', 'incidents', 'resources', 'alerts', 'profile'],
  VOLUNTEER: ['live', 'dashboard', 'assignments', 'alerts', 'profile'],
  RESPONDER: ['live', 'dashboard', 'incidents', 'assignments', 'map', 'alerts', 'profile'],
  ADMIN: [
    'live',
    'dashboard',
    'incidents',
    'assignments',
    'volunteers',
    'resources',
    'requests',
    'alerts',
    'map',
    'analytics',
    'profile',
  ],
};
function AppEntry() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Opening NEXUS India...</div>;
  return <Navigate to={user ? '/' + user.role.toLowerCase() + '/dashboard' : '/login'} replace />;
}
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppStatus />
        <Routes>
          <Route path="/app" element={<AppEntry />} />
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage register />} />
          <Route path="/about" element={<About />} />
          {Object.entries(routes).map(([role, pages]) => (
            <Route key={role} path={'/' + role.toLowerCase()} element={<Guard role={role} />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              {pages.map((p) => (
                <Route key={p} path={p} element={p === 'live' ? <LiveIndia /> : <Workspace />} />
              ))}
            </Route>
          ))}
          <Route
            path="/unauthorized"
            element={
              <div className="error-page">
                <h1>This workspace belongs to another role.</h1>
                <p>Sign in with the appropriate account to continue.</p>
                <Link className="button primary" to="/login">
                  Go to sign in
                </Link>
              </div>
            }
          />
          <Route
            path="*"
            element={
              <div className="error-page">
                <h1>Page not found</h1>
                <Link className="button primary" to="/">
                  Return to NEXUS
                </Link>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
