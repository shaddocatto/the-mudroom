import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { LampIcon } from '../icons';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('sending');
    setError(null);
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (sendError) {
      setError(sendError.message);
      setStatus('error');
    } else {
      setStatus('sent');
    }
  }

  return (
    <div className="app-shell">
      <div className="app-main app-main--centered" style={{ textAlign: 'center' }}>
        <div style={{ color: 'var(--lamp-deep)', marginBottom: 18 }}>
          <LampIcon width={40} height={40} />
        </div>
        <h1 style={{ fontStyle: 'italic' }}>Come as you are.</h1>
        <p style={{ margin: '0 auto 32px', color: 'var(--ink-soft)' }}>
          A gentle place to get to know people, at your own pace, before you ever have to meet.
        </p>

        {status === 'sent' ? (
          <div className="card" style={{ textAlign: 'left' }}>
            <h3>Check your email</h3>
            <p style={{ marginBottom: 0 }}>
              We sent a link to <strong>{email}</strong>. Open it on this device to come in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            {error && <div className="status-banner status-error">{error}</div>}
            <button type="submit" className="btn btn-primary btn-block" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending…' : 'Email me a link'}
            </button>
            <p className="field-hint" style={{ textAlign: 'center', marginTop: 14 }}>
              No password to remember — just an email, whenever you're ready.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
