import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from './api';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = none yet

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    try {
      const data = await api.get('/profiles/me');
      setProfile(data);
    } catch (err) {
      if (err.status === 404) {
        setProfile(null); // signed in, no profile yet -> needs onboarding
      } else {
        setProfile(null);
      }
    }
  }, [user]);

  useEffect(() => {
    setProfile(undefined);
    refresh();
  }, [refresh]);

  return (
    <ProfileContext.Provider value={{ profile, loading: profile === undefined, refresh, setProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
