import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { AppRole } from './roles';

export interface Property {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  city: string | null;
  currency: string;
  timezone: string;
  vat_rate_bp: number;
  tourist_tax_per_night: number;
  breakfast_price: number;
}

export interface Membership {
  property: Property;
  role: AppRole;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface AuthState {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  memberships: Membership[];
  passwordRecovery: boolean;
  endPasswordRecovery: () => void;
  refreshMemberships: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const loadedUser = useRef<string | null>(null);

  const loadUserData = useCallback(async (userId: string) => {
    loadedUser.current = userId;
    const [{ data: prof }, { data: mems }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email').eq('id', userId).maybeSingle(),
      supabase
        .from('memberships')
        .select('role, property:properties(*)')
        .eq('user_id', userId),
    ]);
    setProfile(prof ?? null);
    setMemberships(
      ((mems ?? []) as unknown as { role: AppRole; property: Property | null }[])
        .filter((m): m is Membership => m.property !== null)
        .sort((a, b) => a.property.name.localeCompare(b.property.name, 'fr')),
    );
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) await loadUserData(data.session.user.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'SIGNED_OUT' || !newSession) {
        loadedUser.current = null;
        setProfile(null);
        setMemberships([]);
      } else if ((event === 'SIGNED_IN' && loadedUser.current !== newSession.user.id) || event === 'USER_UPDATED') {
        // Différé : un appel Supabase dans ce callback peut bloquer le client.
        // Le chargement reste affiché jusqu'aux rattachements, sinon l'écran
        // « aucun établissement » clignote à chaque connexion.
        if (event === 'SIGNED_IN') setLoading(true);
        setTimeout(() => loadUserData(newSession.user.id).finally(() => setLoading(false)), 0);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadUserData]);

  const refreshMemberships = useCallback(async () => {
    if (session) await loadUserData(session.user.id);
  }, [session, loadUserData]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{
        loading,
        session,
        profile,
        memberships,
        passwordRecovery,
        endPasswordRecovery: () => setPasswordRecovery(false),
        refreshMemberships,
        signOut,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé sous <AuthProvider>');
  return ctx;
}
