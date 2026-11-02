import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { useProfile } from '../lib/ProfileContext';
import { INVOLVEMENT_LEVELS, CONNECTION_APPETITES, INTERESTS, FAITH_INTEREST } from '../lib/constants';

export default function Settings() {
  const { signOut } = useAuth();
  const { profile, refresh } = useProfile();

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name || '',
        involvement_level: profile.involvement_level,
        connection_appetite: profile.connection_appetite,
        bio: profile.bio || '',
        interests: profile.interests || [],
        interests_other: profile.interests_other || '',
        faith_tradition: profile.faith_tradition || '',
        bioPublic: !!profile.field_visibility?.bio,
        interestsPublic: !!profile.field_visibility?.interests,
      });
    }
  }, [profile]);

  if (!form) return <div className="app-main">Loading&hellip;</div>;

  function toggleInterest(tag) {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(tag) ? f.interests.filter((t) => t !== tag) : [...f.interests, tag],
    }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.post('/profiles/me', {
        display_name: form.display_name.trim(),
        involvement_level: form.involvement_level,
        connection_appetite: form.connection_appetite,
        bio: form.bio.trim() || null,
        interests: form.interests,
        interests_other: form.interests_other.trim() || null,
        faith_tradition: form.faith_tradition.trim() || null,
        field_visibility: { bio: form.bioPublic, interests: form.interestsPublic },
      });
      await refresh();
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const hasFaithInterest = form.interests.includes(FAITH_INTEREST);

  return (
    <div className="app-main">
      <div className="page-header" style={{ padding: 0, marginBottom: 12 }}>
        <h1>Settings</h1>
      </div>

      <div className="field">
        <label>Name</label>
        <input
          type="text"
          value={form.display_name}
          onChange={(e) => setForm({ ...form, display_name: e.target.value })}
        />
      </div>

      <div className="field">
        <label>Involvement level</label>
        {INVOLVEMENT_LEVELS.map((opt) => (
          <button
            key={opt.value}
            className={`chip-option${form.involvement_level === opt.value ? ' is-selected' : ''}`}
            onClick={() => setForm({ ...form, involvement_level: opt.value })}
            type="button"
          >
            <strong>{opt.label}</strong>
            <span>{opt.hint}</span>
          </button>
        ))}
      </div>

      <div className="field">
        <label>Connection appetite</label>
        <div className="chip-group">
          {CONNECTION_APPETITES.map((opt) => (
            <button
              key={opt.value}
              className={`chip${form.connection_appetite === opt.value ? ' is-selected' : ''}`}
              onClick={() => setForm({ ...form, connection_appetite: opt.value })}
              type="button"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Interests</label>
        <div className="chip-group">
          {INTERESTS.map((tag) => (
            <button
              key={tag}
              className={`chip${form.interests.includes(tag) ? ' is-selected' : ''}`}
              onClick={() => toggleInterest(tag)}
              type="button"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {hasFaithInterest && (
        <div className="field">
          <label htmlFor="faith-tradition">Faith tradition (private, optional)</label>
          <input
            id="faith-tradition"
            type="text"
            value={form.faith_tradition}
            onChange={(e) => setForm({ ...form, faith_tradition: e.target.value })}
            placeholder="e.g. Christian"
          />
          <span className="field-hint">Shapes your quiet-moment reflections only — never shown to others.</span>
        </div>
      )}

      <div className="field">
        <label htmlFor="bio">About you</label>
        <textarea id="bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
      </div>

      <div className="field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
          <input
            type="checkbox"
            checked={form.bioPublic}
            onChange={(e) => setForm({ ...form, bioPublic: e.target.checked })}
          />
          Show my bio to others
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
          <input
            type="checkbox"
            checked={form.interestsPublic}
            onChange={(e) => setForm({ ...form, interestsPublic: e.target.checked })}
          />
          Show my interests to others
        </label>
      </div>

      {error && <div className="status-banner status-error">{error}</div>}
      {saved && <div className="status-banner status-success">Saved.</div>}

      <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>

      <button className="btn btn-ghost btn-block" style={{ marginTop: 24 }} onClick={signOut}>
        Sign out
      </button>
    </div>
  );
}
