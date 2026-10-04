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
  legal_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  ninea: string | null;
  rccm: string | null;
  check_in_time: string;
  check_out_time: string;
  require_mfa: boolean;
  notify_email: boolean;
  notify_sms: boolean;
  notify_whatsapp: boolean;
  guest_retention_months: number;
  booking_enabled: boolean;
  booking_slug: string | null;
  booking_hold_minutes: number;
  booking_provider: 'stripe' | 'paydunya';
  public_description: string | null;
  auto_anonymize: boolean;
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
  // Niveau d'assurance de la session : aal2 après un code de double authentification.
  aal: 'aal1' | 'aal2';
  needsMfa: boolean;
  refreshAal: () => Promise<void>;
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
  const [aal, setAal] = useState<'aal1' | 'aal2'>('aal1');
  const [needsMfa, setNeedsMfa] = useState(false);

  // Le niveau se lit dans le jeton de session, sans appel réseau : appeler le
  // client Supabase pendant un événement d'authentification le bloque.
  const applyAal = useCallback((s: Session | null) => {
    const level = aalOf(s);
    const hasFactor = (s?.user.factors ?? []).some((f) => f.status === 'verified');
    setAal(level);
    setNeedsMfa(hasFactor && level !== 'aal2');
  }, []);

  const refreshAal = useCallback(async () => {
    const { data } = await supabase.auth.refreshSession();
    applyAal(data.session);
  }, [applyAal]);

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
      applyAal(data.session);
      if (data.session) await loadUserData(data.session.user.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      applyAal(newSession);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'MFA_CHALLENGE_VERIFIED') setTimeout(() => loadUserData(newSession!.user.id), 0);
      if (event === 'SIGNED_OUT' || !newSession) {
        loadedUser.current = null;
        setAal('aal1');
        setNeedsMfa(false);
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
  }, [loadUserData, applyAal]);

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
        aal,
        needsMfa,
        refreshAal,
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

function aalOf(s: Session | null): 'aal1' | 'aal2' {
  try {
    const payload = JSON.parse(atob(s!.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.aal === 'aal2' ? 'aal2' : 'aal1';
  } catch {
    return 'aal1';
  }
}
