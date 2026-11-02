import { useState } from 'react';
import { api } from '../lib/api';
import { useProfile } from '../lib/ProfileContext';
import { INVOLVEMENT_LEVELS, CONNECTION_APPETITES, INTERESTS, FAITH_INTEREST } from '../lib/constants';

const STEPS = ['name', 'involvement', 'appetite', 'profile'];

export default function Onboarding() {
  const { refresh } = useProfile();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [displayName, setDisplayName] = useState('');
  const [involvement, setInvolvement] = useState('');
  const [appetite, setAppetite] = useState('');
  const [interests, setInterests] = useState([]);
  const [interestsOther, setInterestsOther] = useState('');
  const [bio, setBio] = useState('');
  const [faithTradition, setFaithTradition] = useState('');
  const [bioPublic, setBioPublic] = useState(false);
  const [interestsPublic, setInterestsPublic] = useState(true);

  const hasFaithInterest = interests.includes(FAITH_INTEREST);

  function toggleInterest(tag) {
    setInterests((cur) => (cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]));
  }

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      await api.post('/profiles/me', {
        display_name: displayName.trim(),
        involvement_level: involvement,
        connection_appetite: appetite,
        bio: bio.trim() || null,
        interests,
        interests_other: interestsOther.trim() || null,
        faith_tradition: faithTradition.trim() || null,
        field_visibility: {
          bio: bioPublic,
          interests: interestsPublic,
        },
      });
      await refresh();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="app-main">
        <div className="progress-dots">
          {STEPS.map((s, i) => (
            <span key={s} className={i === step ? 'is-active' : ''} />
          ))}
        </div>

        {step === 0 && (
          <section>
            <h1>What should people call you?</h1>
            <p>A first name or nickname is plenty — no pressure to share more yet.</p>
            <div className="field">
              <input
                type="text"
                placeholder="Your name or nickname"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoFocus
              />
            </div>
            <button className="btn btn-primary btn-block" disabled={!displayName.trim()} onClick={next}>
              Continue
            </button>
          </section>
        )}

        {step === 1 && (
          <section>
            <h1>How do you want to ease in?</h1>
            <p>You can change this anytime in Settings.</p>
            {INVOLVEMENT_LEVELS.map((opt) => (
              <button
                key={opt.value}
                className={`chip-option${involvement === opt.value ? ' is-selected' : ''}`}
                onClick={() => setInvolvement(opt.value)}
              >
                <strong>{opt.label}</strong>
                <span>{opt.hint}</span>
              </button>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={back}>
                Back
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={!involvement} onClick={next}>
                Continue
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h1>How many new connections sound right?</h1>
            <p>Just a rough feel — nothing's locked in. A strong connection can always find you anyway.</p>
            <div className="chip-group" style={{ marginBottom: 20 }}>
              {CONNECTION_APPETITES.map((opt) => (
                <button
                  key={opt.value}
                  className={`chip${appetite === opt.value ? ' is-selected' : ''}`}
                  onClick={() => setAppetite(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={back}>
                Back
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={!appetite} onClick={next}>
                Continue
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h1>Anything you'd like to share?</h1>
            <p>Completely optional — you can always add this later.</p>

            <div className="field">
              <label>What are you into?</label>
              <div className="chip-group">
                {INTERESTS.map((tag) => (
                  <button
                    key={tag}
                    className={`chip${interests.includes(tag) ? ' is-selected' : ''}`}
                    onClick={() => toggleInterest(tag)}
                    type="button"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label htmlFor="interests-other">Something else? (optional)</label>
              <input
                id="interests-other"
                type="text"
                value={interestsOther}
                onChange={(e) => setInterestsOther(e.target.value)}
                placeholder="e.g. birdwatching"
              />
            </div>

            {hasFaithInterest && (
              <div className="field">
                <label htmlFor="faith-tradition">If you'd like, share your faith tradition</label>
                <input
                  id="faith-tradition"
                  type="text"
                  value={faithTradition}
                  onChange={(e) => setFaithTradition(e.target.value)}
                  placeholder="Totally optional — e.g. Christian"
                />
                <span className="field-hint">
                  Private by default. We'll only use this to make your quiet-moment reflections more specific to
                  you — leave it blank and they'll stay gentle and tradition-neutral.
                </span>
              </div>
            )}

            <div className="field">
              <label htmlFor="bio">A little about you</label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share as much or as little as you'd like"
              />
            </div>

            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                <input type="checkbox" checked={bioPublic} onChange={(e) => setBioPublic(e.target.checked)} />
                Show my bio to others
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={interestsPublic}
                  onChange={(e) => setInterestsPublic(e.target.checked)}
                />
                Show my interests to others
              </label>
              <span className="field-hint">Every bit of your profile has its own private/public switch.</span>
            </div>

            {error && <div className="status-banner status-error">{error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={back} disabled={saving}>
                Back
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={finish} disabled={saving}>
                {saving ? 'Settling in…' : 'Step inside'}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
