import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { SendIcon } from '../icons';

export default function ConversationThread() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState(null);
  const [nudge, setNudge] = useState(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [msgs, latestNudge] = await Promise.all([
        api.get(`/conversations/${id}/messages`),
        api.get(`/conversations/${id}/nudges`),
      ]);
      setMessages(msgs);
      setNudge(latestNudge);
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(e) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    try {
      const message = await api.post(`/conversations/${id}/messages`, { body });
      setMessages((cur) => [...(cur || []), message]);
    } catch (err) {
      setError(err.message);
    }
  }

  async function dismissNudge() {
    try {
      await api.post(`/conversations/${id}/nudges/${nudge.id}/dismiss`);
      setNudge(null);
    } catch {
      /* harmless if it fails — nudge just stays until next load */
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--wall-dim)' }}>
        <Link to="/conversations" className="btn-ghost btn" style={{ padding: '6px 10px' }} aria-label="Back">
          ←
        </Link>
        <h2 style={{ margin: 0 }}>Conversation</h2>
      </div>

      <div className="app-main" style={{ flex: 1, paddingBottom: 20 }}>
        {nudge && (
          <div className="nudge-banner">
            <p>You two are clicking. Worth taking this offline?</p>
            <div className="nudge-banner__actions">
              <button className="btn btn-primary" onClick={() => navigate(`/conversations/${id}/plan`)}>
                Plan something together
              </button>
              <button className="btn btn-ghost" onClick={dismissNudge}>
                Not now
              </button>
            </div>
          </div>
        )}

        {error && <div className="status-banner status-error">{error}</div>}

        {messages === null && !error && <p>One moment…</p>}

        {messages?.length === 0 && (
          <div className="empty-state">
            <h3>Say hello</h3>
            <p>This is just between the two of you.</p>
          </div>
        )}

        <div className="thread">
          {messages?.map((m) => (
            <div key={m.id} className={`bubble ${m.sender_id === user.id ? 'bubble-me' : 'bubble-them'}`}>
              {m.body}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <form className="composer" onSubmit={send}>
        <input
          type="text"
          placeholder="Write something…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" aria-label="Send">
          <SendIcon width={18} height={18} style={{ color: '#2C2008' }} />
        </button>
      </form>
    </div>
  );
}
