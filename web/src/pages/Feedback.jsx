import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';

// Deliberately scoped to the app's own performance, never the relationship
// itself (design doc: "Post-meetup & ongoing role").
export default function Feedback() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [nudgeQuality, setNudgeQuality] = useState(0);
  const [spotQuality, setSpotQuality] = useState(0);
  const [openFeedback, setOpenFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [reopened, setReopened] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    try {
      await api.post(`/feedback/${id}`, {
        nudge_quality: nudgeQuality || null,
        spot_quality: spotQuality || null,
        open_feedback: openFeedback.trim() || null,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    }
  }

  async function reopenToNewSignals() {
    try {
      await api.post(`/feedback/${id}/reopen-to-new-signals`);
      setReopened(true);
    } catch (err) {
      setError(err.message);
    }
  }

  function StarRow({ value, onChange, label }) {
    return (
      <div className="field">
        <label>{label}</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`chip${value >= n ? ' is-selected' : ''}`}
              style={{ padding: '8px 14px' }}
              onClick={() => onChange(n)}
              aria-label={`${n} out of 5`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="app-main" style={{ textAlign: 'center', paddingTop: 40 }}>
        <h1>Thanks for letting us know</h1>
        {!reopened ? (
          <>
            <p>
              Meeting one person doesn&rsquo;t have to be the end &mdash; want us to keep an eye out for someone
              new too?
            </p>
            <button className="btn btn-primary" onClick={reopenToNewSignals}>
              Yes, I&rsquo;m open to that
            </button>
            <div style={{ marginTop: 10 }}>
              <button className="btn btn-ghost" onClick={() => navigate('/kindred')}>
                Not right now
              </button>
            </div>
          </>
        ) : (
          <>
            <p>Good — you&rsquo;re open to new signals whenever they come.</p>
            <Link to="/kindred" className="btn btn-secondary">
              Back to Kindred Spirits
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="app-main">
      <div className="page-header" style={{ padding: 0, marginBottom: 12 }}>
        <h1>How did it go?</h1>
        <p>Just about how the app did — not about the two of you.</p>
      </div>

      <form onSubmit={submit}>
        <StarRow value={nudgeQuality} onChange={setNudgeQuality} label="Was the timing of the nudge good?" />
        <StarRow value={spotQuality} onChange={setSpotQuality} label="Was the suggested spot good? (if used)" />
        <div className="field">
          <label htmlFor="open-feedback">Anything else?</label>
          <textarea
            id="open-feedback"
            value={openFeedback}
            onChange={(e) => setOpenFeedback(e.target.value)}
            placeholder="Optional"
          />
        </div>
        {error && <div className="status-banner status-error">{error}</div>}
        <button type="submit" className="btn btn-primary btn-block">
          Send feedback
        </button>
      </form>
    </div>
  );
}
