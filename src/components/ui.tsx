import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { useI18n } from '../lib/i18n';

// Briques d'interface communes aux écrans, dans le style existant
// (cartes arrondies, orange #ea580c, bleu nuit #09153D).

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-black text-[#09153D] tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 font-medium mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className = '' }: { title?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {title && <h3 className="text-sm font-bold text-slate-900">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/10',
  secondary: 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700',
  danger: 'bg-red-50 hover:bg-red-100 border border-red-200 text-red-700',
  ghost: 'hover:bg-slate-100 text-slate-600',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
};

export function Button({
  variant = 'primary', busy, icon: Icon, children, className = '', ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={`inline-flex items-center justify-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : Icon ? <Icon className="w-3.5 h-3.5" /> : null}
      {children}
    </button>
  );
}

// Largeur pleine par défaut, sauf si l'appelant en impose une (w-28, md:w-60…).
const widthOf = (className?: string) => (/(^|\s)(\w+:)?w-/.test(className ?? '') ? '' : 'w-full');

const fieldClass =
  'bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:opacity-60';

export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-slate-400">{hint}</span>}
    </label>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input(props, ref) {
    return <input ref={ref} {...props} className={`${fieldClass} ${widthOf(props.className)} ${props.className ?? ''}`} />;
  },
);

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldClass} ${widthOf(props.className)} cursor-pointer ${props.className ?? ''}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldClass} w-full resize-none ${props.className ?? ''}`} />;
}

export function Checkbox({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
      <input type="checkbox" {...props} className="accent-orange-600 w-4 h-4" />
      {label}
    </label>
  );
}

export function Modal({
  title, subtitle, onClose, children, wide,
}: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const { tr } = useI18n();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-50 bg-[#09153D]/30 backdrop-blur-[2px] flex items-start md:items-center justify-center p-4 overflow-y-auto no-print" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`bg-white rounded-[28px] border border-slate-100 shadow-2xl w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} my-8`}>
        <div className="flex items-start justify-between gap-3 p-6 pb-3">
          <div>
            <h3 className="font-extrabold text-[#09153D]">{title}</h3>
            {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label={tr('Fermer', 'Close')} className="text-slate-400 hover:text-slate-700 cursor-pointer p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex gap-2 p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function Loading() {
  const { tr } = useI18n();
  return (
    <div className="py-16 flex items-center justify-center text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin" aria-label={tr('Chargement', 'Loading')} />
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate-400 italic text-center py-8">{children}</p>;
}

const BADGE_TONES = {
  slate: 'bg-slate-100 text-slate-600',
  orange: 'bg-orange-50 text-orange-700',
  green: 'bg-emerald-50 text-emerald-700',
  blue: 'bg-sky-50 text-sky-700',
  red: 'bg-red-50 text-red-700',
  amber: 'bg-amber-50 text-amber-700',
  violet: 'bg-violet-50 text-violet-700',
};
export type Tone = keyof typeof BADGE_TONES;

export function Badge({ tone = 'slate', children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md ${BADGE_TONES[tone]}`}>{children}</span>;
}

export function Table({ head, children }: { head: React.ReactNode[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-slate-100 rounded-2xl">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50/70 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
            {head.map((h, i) => (
              <th key={i} className="p-3 text-left whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { id: NoInfer<T>; label: string }[] }) {
  return (
    <div role="tablist" className="flex gap-1 bg-slate-100/70 p-1 rounded-xl w-fit max-w-full overflow-x-auto mb-6">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`text-[11px] font-bold px-3.5 py-1.5 rounded-lg whitespace-nowrap cursor-pointer ${value === t.id ? 'bg-white text-[#09153D] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-extrabold text-[#09153D] font-mono mt-2">{value}</p>
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

// Exécute une action serveur avec indicateur et message d'erreur.
export function useAction() {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const run = React.useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError((e as Error).message);
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, setError, run };
}
