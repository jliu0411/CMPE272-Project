import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import { supabase, isConfigured } from '../services/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(isConfigured);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    if (!supabase) return;

    let active = true;

    async function initializeAuth() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (!active) return;

        setUser(error ? null : data.user);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    initializeAuth();

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) return;

        setUser(session?.user ?? null);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user || !supabase) {
      setProfile(null);
      setProfileError('');
      return;
    }

    let active = true;

    async function loadProfile() {
      setLoading(true);
      setProfileError('');
      setProfile(null);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('id', user.id)
          .single();

        if (!active) return;

        if (error || !data) {
          setProfileError('Unable to load your user profile.');
        } else {
          setProfile(data);
        }
      } catch {
        if (active) {
          setProfileError('Unable to connect to Supabase.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [user?.id]);

  async function signIn(email, password) {
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  }

  async function signOut() {
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        profileError,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be inside AuthProvider');
  }

  return context;
}