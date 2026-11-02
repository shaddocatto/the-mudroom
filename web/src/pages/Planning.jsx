import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ACTIVITY_TYPES } from '../lib/constants';

export default function Planning() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState(null); // not_started | pending | unlocked | resolved
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);

  const [first, setFirst] = useState({ type: '', area: '' });
  const [second, setSecond] = useState({ type: '', area: '' });
  const [submitted, setSubmitted] = useState(false);
  const [resolved, setResolved] = useState(null);

  useEffect(() => {
    api
      .get(`/conversations/${id}/planning-status`)
      .then((s) => setStatus(s.status))
      .catch((err) => setError(err.message));
  }, [id]);

  async function confirmIdentity() {
    setConfirming(true);
    try {
      const res = await api.post(`/conversations/${id}/confirm-identity`);
      setStatus(res.unlocked ? 'unlocked' : 'pending');
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  }

  async function submitChoices(e) {
    e.preventDefault();
    try {
      const res = await api.post(`/conversations/${id}/activity-choices`, {
        first,
        second: second.type && second.area ? second : null,
      });
      setSubmitted(true);
      if (res.resolved) setResolved(res.resolved);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--wall-dim)' }}>
        <Link to={`/conversations/${id}`} className="btn-ghost btn" style={{ padding: '6px 10px' }} aria-label="Back">
          &larr;
        </Link>
        <h2 style={{ margin: 0 }}>Planning</h2>
      </div>

      <div className="app-main">
        {error && <div className="status-banner status-error">{error}</div>}

        {status === null && !error && <p>One moment&hellip;</p>}

        {(status === 'not_started' || status === 'pending') && (
          <section style={{ textAlign: 'center', marginTop: 20 }}>
            <h1>Ready to be known, not just chatted with?</h1>
            <p>
              This shares your real name and photo with them, and unlocks this space once you&rsquo;ve both said
              yes. Your conversation stays exactly as private as it&rsquo;s been &mdash; this is just a separate
              logistics space the two of you step into on purpose.
            </p>
            {status === 'pending' ? (
              <div className="card">
                <p style={{ marginBottom: 0 }}>You&rsquo;ve confirmed. Waiting on them &mdash; no rush.</p>
              </div>
            ) : (
              <button className="btn btn-primary" onClick={confirmIdentity} disabled={confirming}>
                {confirming ? 'One moment&hellip;' : 'Yes, share my name and photo'}
              </button>
            )}
          </section>
        )}

        {status === 'unlocked' && !submitted && (
          <section>
            <h1>Let&rsquo;s find a plan</h1>
            <p>Pick a first and second choice each &mdash; we&rsquo;ll look for anything that overlaps.</p>

            <form onSubmit={submitChoices}>
              <h3>First choice</h3>
              <div className="field">
                <label>Activity</label>
                <select value={first.type} onChange={(e) => setFirst({ ...first, type: e.target.value })} required>
                  <option value="">Choose one</option>
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Area</label>
                <input
                  type="text"
                  placeholder="e.g. near Central Church"
                  value={first.area}
                  onChange={(e) => setFirst({ ...first, area: e.target.value })}
                  required
                />
              </div>

              <h3>Second choice (optional)</h3>
              <div className="field">
                <label>Activity</label>
                <select value={second.type} onChange={(e) => setSecond({ ...second, type: e.target.value })}>
                  <option value="">Choose one</option>
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Area</label>
                <input
                  type="text"
                  value={second.area}
                  onChange={(e) => setSecond({ ...second, area: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                Submit my choices
              </button>
            </form>
          </section>
        )}

        {submitted && (
          <section style={{ textAlign: 'center', marginTop: 20 }}>
            {resolved ? (
              <>
                <h1>You both picked {resolved.activity.toLowerCase()}</h1>
                <p>Near {resolved.area}. The rest &mdash; like when &mdash; is up to the two of you.</p>
              </>
            ) : (
              <>
                <h1>Choices submitted</h1>
                <p>We&rsquo;ll let you know as soon as there&rsquo;s a match. If there isn&rsquo;t an obvious overlap, just talk it through &mdash; you&rsquo;re both already here.</p>
              </>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12 }}>
              <button className="btn btn-secondary" onClick={() => navigate(`/conversations/${id}`)}>
                Back to conversation
              </button>
              {resolved && (
                <Link className="btn btn-ghost" to={`/conversations/${id}/feedback`}>
                  After you meet, share feedback
                </Link>
              )}
            </div>
          </section>
        )}

        {status === 'resolved' && (
          <section style={{ textAlign: 'center', marginTop: 20 }}>
            <h1>All set</h1>
            <p>You two worked out a plan. Enjoy it!</p>
            <Link className="btn btn-secondary" to={`/conversations/${id}/feedback`}>
              After you meet, share feedback
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
