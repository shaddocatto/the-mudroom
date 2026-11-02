import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
import { useProfile } from './lib/ProfileContext';
import NavBar from './components/NavBar';

import SignIn from './pages/SignIn';
import Onboarding from './pages/Onboarding';
import KindredSpirits from './pages/KindredSpirits';
import Conversations from './pages/Conversations';
import ConversationThread from './pages/ConversationThread';
import Planning from './pages/Planning';
import Feedback from './pages/Feedback';
import Settings from './pages/Settings';

function Loading() {
  return (
    <div className="app-shell">
      <div className="app-main app-main--centered">
        <p className="center-wordmark" style={{ textAlign: 'center' }}>
          the mudroom
        </p>
      </div>
    </div>
  );
}

function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/" replace />;
  return <Outlet />;
}

function RequireProfile() {
  const { profile, loading } = useProfile();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!profile) return <Navigate to="/onboarding" replace />;

  const hideNav = /^\/conversations\/[^/]+/.test(location.pathname);

  return (
    <div className="app-shell">
      <Outlet />
      {!hideNav && <NavBar />}
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={loading ? <Loading /> : user ? <Navigate to="/kindred" replace /> : <SignIn />}
      />
      <Route element={<RequireAuth />}>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route element={<RequireProfile />}>
          <Route path="/kindred" element={<KindredSpirits />} />
          <Route path="/conversations" element={<Conversations />} />
          <Route path="/conversations/:id" element={<ConversationThread />} />
          <Route path="/conversations/:id/plan" element={<Planning />} />
          <Route path="/conversations/:id/feedback" element={<Feedback />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
