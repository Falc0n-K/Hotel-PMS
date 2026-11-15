import { Modal } from './ui';
import { useI18n } from '../lib/i18n';

export interface GotoShortcut {
  key: string;
  label: string;
}

// Aide des raccourcis clavier (touche « ? »).
export default function ShortcutsHelp({ gotos, onClose }: { gotos: GotoShortcut[]; onClose: () => void }) {
  const { tr } = useI18n();
  const rows: { keys: string[]; label: string }[] = [
    { keys: ['Ctrl', 'K'], label: tr('Recherche globale (⌘ K sur Mac)', 'Global search (⌘ K on Mac)') },
    { keys: ['/'], label: tr('Recherche globale', 'Global search') },
    { keys: ['?'], label: tr('Afficher cette aide', 'Show this help') },
    ...gotos.map((g) => ({ keys: ['g', g.key], label: tr(`Aller à : ${g.label}`, `Go to: ${g.label}`) })),
    { keys: ['Esc'], label: tr('Fermer la fenêtre', 'Close the window') },
  ];
  return (
    <Modal
      title={tr('Raccourcis clavier', 'Keyboard shortcuts')}
      subtitle={tr('Inactifs pendant la saisie dans un champ.', 'Disabled while typing in a field.')}
      onClose={onClose}
    >
      <ul className="divide-y divide-slate-100">
        {rows.map((r) => (
          <li key={r.keys.join('+')} className="flex items-center justify-between gap-3 py-2.5 text-xs">
            <span className="text-slate-700 font-medium">{r.label}</span>
            <span className="flex items-center gap-1 shrink-0">
              {r.keys.map((k, i) => (
                <kbd key={i} className="min-w-6 text-center text-[11px] font-bold font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5">{k}</kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
