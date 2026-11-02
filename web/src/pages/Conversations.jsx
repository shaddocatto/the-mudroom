import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

export default function Conversations() {
  const { user } = useAuth();
  const [convos, setConvos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/conversations')
      .then(setConvos)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="app-main">
      <div className="page-header" style={{ padding: 0, marginBottom: 12 }}>
        <h1>Conversations</h1>
      </div>

      {error && <div className="status-banner status-error">{error}</div>}
      {convos === null && !error && <p>One moment…</p>}

      {convos?.length === 0 && (
        <div className="empty-state">
          <h3>Nothing here yet</h3>
          <p>Say hello to someone in Kindred Spirits to start a conversation.</p>
        </div>
      )}

      {convos?.map((c) => {
        const other = c.user_a === user.id ? c.user_b_profile : c.user_a_profile;
        const name = other?.display_name || 'Someone';
        return (
          <Link key={c.id} to={`/conversations/${c.id}`} className="convo-row">
            <div className="convo-avatar">{name[0]?.toUpperCase()}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="convo-row__name">{name}</div>
              <p className="convo-row__preview">
                {c.status === 'nudged'
                  ? "You two are clicking — worth taking this offline?"
                  : c.status === 'planning'
                  ? 'Planning something together'
                  : c.status === 'met'
                  ? 'You met up'
                  : 'Say hi whenever you’re ready'}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
