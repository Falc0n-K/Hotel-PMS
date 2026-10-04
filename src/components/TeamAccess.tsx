import React, { useCallback, useEffect, useState } from 'react';
import { UserPlus, ShieldCheck, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase, errorMessage } from '../lib/supabase';
import { APP_ROLE_LABELS, type AppRole } from '../lib/roles';
import type { Property } from '../lib/auth';
import { useI18n } from '../lib/i18n';

interface MemberRow {
  id: string;
  user_id: string;
  role: AppRole;
  profile: { full_name: string | null; email: string | null } | null;
}

interface Props {
  property: Property;
  myRole: AppRole;
  myUserId: string;
}

// Gestion des accès réels : rôles persistés en base, appliqués par la RLS.
// Les règles (un directeur ne nomme pas de propriétaire, on ne se retire pas
// soi-même) sont vérifiées côté serveur ; l'interface ne fait que les refléter.
export default function TeamAccess({ property, myRole, myUserId }: Props) {
  const { tr } = useI18n();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>('front_desk');
  const [busy, setBusy] = useState(false);

  const assignable = (Object.keys(APP_ROLE_LABELS) as AppRole[]).filter((r) => myRole === 'owner' || r !== 'owner');

  const load = useCallback(async () => {
    // memberships.user_id et profiles.id pointent tous deux vers auth.users :
    // PostgREST ne peut pas les joindre seul, on fait deux requêtes.
    const { data, error } = await supabase
      .from('memberships')
      .select('id, user_id, role')
      .eq('property_id', property.id)
      .order('created_at');
    if (error) {
      setError(errorMessage(error));
      setLoading(false);
      return;
    }
    const ids = (data ?? []).map((m) => m.user_id);
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', ids);
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    setMembers((data ?? []).map((m) => ({ ...(m as Omit<MemberRow, 'profile'>), profile: byId.get(m.user_id) ?? null })));
    setLoading(false);
  }, [property.id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc('add_member_by_email', { p_property: property.id, p_email: email, p_role: role });
    setBusy(false);
    if (error) setError(errorMessage(error));
    else {
      setEmail('');
      load();
    }
  };

  const changeRole = async (m: MemberRow, newRole: AppRole) => {
    setError(null);
    const { error } = await supabase.from('memberships').update({ role: newRole }).eq('id', m.id).select('id').single();
    if (error) setError(errorMessage(error));
    load();
  };

  const remove = async (m: MemberRow) => {
    const who = m.profile?.full_name ?? m.profile?.email;
    if (!confirm(tr(`Retirer l’accès de ${who ?? 'cet utilisateur'} à ${property.name} ?`, `Remove ${who ?? 'this user'}'s access to ${property.name}?`))) return;
    setError(null);
    const { error } = await supabase.from('memberships').delete().eq('id', m.id).select('id').single();
    if (error) setError(errorMessage(error));
    load();
  };

  return (
    <div className="space-y-6 fade-in-up">
      <div>
        <h2 className="text-2xl font-black text-[#09153D] tracking-tight">{tr('Équipe et accès', 'Team and access')}</h2>
        <p className="text-xs text-slate-400 font-medium">
          {tr(
            `Rôles appliqués par le serveur pour ${property.name}. Un collaborateur crée d’abord son compte, puis vous l’ajoutez ici avec son adresse e-mail.`,
            `Roles enforced by the server for ${property.name}. A team member first creates their account, then you add them here with their email address.`,
          )}
        </p>
      </div>

      <form onSubmit={add} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3">
        <input
          type="email"
          required
          aria-label={tr('E-mail du collaborateur', 'Team member email')}
          placeholder={tr('E-mail du collaborateur', 'Team member email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 bg-slate-50 border border-slate-200 text-xs p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
        <select
          aria-label={tr('Rôle', 'Role')}
          value={role}
          onChange={(e) => setRole(e.target.value as AppRole)}
          className="bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl cursor-pointer"
        >
          {assignable.map((r) => (
            <option key={r} value={r}>
              {APP_ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={busy}
          className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-3 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} {tr('Ajouter', 'Add')}
        </button>
      </form>

      {error && (
        <div role="alert" className="flex gap-2 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50/60 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              <th className="p-4 text-left">{tr('Collaborateur', 'Team member')}</th>
              <th className="p-4 text-left">{tr('Rôle', 'Role')}</th>
              <th className="p-4 text-right">{tr('Action', 'Action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={3} className="p-8 text-center text-slate-400">
                  {tr('Chargement…', 'Loading…')}
                </td>
              </tr>
            ) : (
              members.map((m) => {
                const isMe = m.user_id === myUserId;
                const locked = isMe || (myRole !== 'owner' && m.role === 'owner');
                return (
                  <tr key={m.id}>
                    <td className="p-4">
                      <p className="font-bold text-slate-800">
                        {m.profile?.full_name ?? '—'} {isMe && <span className="text-[10px] text-slate-400">{tr('(vous)', '(you)')}</span>}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">{m.profile?.email}</p>
                    </td>
                    <td className="p-4">
                      {locked ? (
                        <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                          <ShieldCheck className="w-3.5 h-3.5 text-orange-600" /> {APP_ROLE_LABELS[m.role]}
                        </span>
                      ) : (
                        <select
                          aria-label={tr(`Rôle de ${m.profile?.full_name ?? m.profile?.email}`, `Role of ${m.profile?.full_name ?? m.profile?.email}`)}
                          value={m.role}
                          onChange={(e) => changeRole(m, e.target.value as AppRole)}
                          className="bg-slate-50 border border-slate-200 text-xs font-bold p-2 rounded-lg cursor-pointer"
                        >
                          {assignable.map((r) => (
                            <option key={r} value={r}>
                              {APP_ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {!locked && (
                        <button
                          onClick={() => remove(m)}
                          aria-label={tr('Retirer l’accès', 'Remove access')}
                          className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
