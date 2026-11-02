import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useProfile } from '../lib/ProfileContext';
import ReflectionCard from '../components/ReflectionCard';
import { FAITH_INTEREST } from '../lib/constants';

export default function KindredSpirits() {
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [people, setPeople] = useState(null);
  const [error, setError] = useState(null);
  const [startingId, setStartingId] = useState(null);

  useEffect(() => {
    api
      .get('/profiles')
      .then(setPeople)
      .catch((err) => setError(err.message));
  }, []);

  const myInterests = new Set(profile?.interests || []);

  async function startConversation(otherId) {
    setStartingId(otherId);
    try {
      const convo = await api.post('/conversations', { other_user_id: otherId });
      navigate(`/conversations/${convo.id}`);
    } catch (err) {
      setError(err.message);
      setStartingId(null);
    }
  }

  return (
    <div className="app-main">
      <div className="page-header" style={{ padding: 0, marginBottom: 20 }}>
        <h1>Kindred Spirits</h1>
        <p>No ranking, no rush — just people from the community, whenever you feel like looking.</p>
      </div>

      <ReflectionCard profile={profile} />

      {error && <div className="status-banner status-error">{error}</div>}

      {people === null && !error && <p>Looking around…</p>}

      {people?.length === 0 && (
        <div className="empty-state">
          <h3>It's quiet here right now</h3>
          <p>New folks join all the time — check back whenever you'd like.</p>
        </div>
      )}

      {people?.map((person) => {
        const shared = (person.interests || []).filter((i) => myInterests.has(i));
        const rest = (person.interests || []).filter((i) => !shared.includes(i));
        return (
          <div className="kindred-card" key={person.id}>
            <div>
              <div className="kindred-card__name">{person.display_name}</div>
              {person.bio && <p style={{ margin: '4px 0 0' }}>{person.bio}</p>}
            </div>
            {(shared.length > 0 || rest.length > 0) && (
              <div className="kindred-card__tags">
                {shared.map((tag) => (
                  <span key={tag} className="tag tag-shared">
                    {tag === FAITH_INTEREST ? tag : `You both like ${tag}`}
                  </span>
                ))}
                {rest.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <button
              className="btn btn-secondary"
              onClick={() => startConversation(person.id)}
              disabled={startingId === person.id}
            >
              {startingId === person.id ? 'Starting…' : 'Say hello'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
