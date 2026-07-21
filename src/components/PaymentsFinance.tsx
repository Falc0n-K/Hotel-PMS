/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  ArrowDownRight, 
  ArrowUpRight, 
  Receipt, 
  Search, 
  Plus, 
  Check, 
  X, 
  Sparkles, 
  CreditCard, 
  Building2, 
  FileText, 
  Wallet, 
  Filter, 
  Clock, 
  ArrowRightLeft, 
  ShieldCheck, 
  Percent,
  Download,
  AlertCircle
} from 'lucide-react';
import { RBACRole } from '../types';

interface PaymentsFinanceProps {
  currentHotel: string;
  currentRole: RBACRole;
  onAddNotification: (title: string, message: string, type: 'réservation' | 'paiement' | 'alerte' | 'info') => void;
}

interface TransactionItem {
  id: string;
  guestName: string;
  roomNo: string;
  amount: number;
  date: string;
  type: 'Entrée' | 'Sortie';
  category: 'Hébergement' | 'Restauration' | 'Ménage & Blanchisserie' | 'Maintenance' | 'Marketing & Promo' | 'Taxes & Patentes' | 'Autre Activité';
  method: 'Wave' | 'Orange Money' | 'Espèces' | 'Carte Bancaire' | 'Virement';
  status: 'Confirmé' | 'Acompte' | 'En attente' | 'Remboursé';
  referenceCode?: string;
}

export default function PaymentsFinance({
  currentHotel,
  currentRole,
  onAddNotification
}: PaymentsFinanceProps) {
  // Strict page guard for Payments & Finance
  if ((currentRole as string) !== 'Propriétaire d\'Hôtel' && (currentRole as string) !== 'Directeur Financier') {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm max-w-2xl mx-auto my-12 fade-in-up flex flex-col items-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-sm font-extrabold text-[#09153D] font-sans">Accès Interdit • Habilitation Insuffisante</h3>
        <p className="text-xs text-slate-500 mt-2 max-w-md leading-relaxed text-center">
          Les données financières, comptes d'exploitation, Wave/Orange Money et grands livres comptables de l'établissement <strong>{currentHotel}</strong> sont hautement confidentiels. Votre rôle actuel (<strong>{currentRole}</strong>) ne possède pas l'accréditation requise.
        </p>
      </div>
    );
  }

  // Master transactions list (simulated database) with local Senegalese details like Wave and Orange Money 
  const [transactions, setTransactions] = useState<TransactionItem[]>([
    {
      id: 'TX-2026-001',
      guestName: 'Alastair Cook',
      roomNo: '104',
      amount: 512000,
      date: '2026-05-21',
      type: 'Entrée',
      category: 'Hébergement',
      method: 'Wave',
      status: 'Confirmé',
      referenceCode: 'WV-2105671'
    },
    {
      id: 'TX-2026-002',
      guestName: 'Sokhna Diagne',
      roomNo: '102',
      amount: 220000,
      date: '2026-05-20',
      type: 'Entrée',
      category: 'Hébergement',
      method: 'Orange Money',
      status: 'Confirmé',
      referenceCode: 'OM-309485'
    },
    {
      id: 'TX-2026-003',
      guestName: 'Elena Rostova',
      roomNo: '201',
      amount: 295500,
      date: '2026-05-20',
      type: 'Entrée',
      category: 'Hébergement',
      method: 'Carte Bancaire',
      status: 'Acompte',
      referenceCode: 'CB-883492'
    },
    {
      id: 'TX-2026-004',
      guestName: 'Achat détergents pro',
      roomNo: 'N/A',
      amount: 45000,
      date: '2026-05-19',
      type: 'Sortie',
      category: 'Ménage & Blanchisserie',
      method: 'Espèces',
      status: 'Confirmé'
    },
    {
      id: 'TX-2026-005',
      guestName: 'Marcus Aurel',
      roomNo: '112',
      amount: 250500,
      date: '2026-05-18',
      type: 'Entrée',
      category: 'Hébergement',
      method: 'Virement',
      status: 'En attente',
      referenceCode: 'VR-90481'
    },
    {
      id: 'TX-2026-006',
      guestName: 'Réparation Climatiseur',
      roomNo: '205',
      amount: 85000,
      date: '2026-05-17',
      type: 'Sortie',
      category: 'Maintenance',
      method: 'Orange Money',
      status: 'Confirmé',
      referenceCode: 'OM-294812'
    },
    {
      id: 'TX-2026-007',
      guestName: 'Jean-Pierre Durand',
      roomNo: '204',
      amount: 317500,
      date: '2026-05-15',
      type: 'Entrée',
      category: 'Hébergement',
      method: 'Carte Bancaire',
      status: 'Confirmé',
      referenceCode: 'CB-21094'
    },
    {
      id: 'TX-2026-008',
      guestName: 'Approvisionnement Cuisine',
      roomNo: 'N/A',
      amount: 120000,
      date: '2026-05-14',
      type: 'Sortie',
      category: 'Restauration',
      method: 'Espèces',
      status: 'Confirmé'
    }
  ]);

  // UI state variables
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'Tous' | 'Entrée' | 'Sortie'>('Tous');
  const [methodFilter, setMethodFilter] = useState<string>('Tous');
  const [toast, setToast] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Modals state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [invoicePreviewData, setInvoicePreviewData] = useState<TransactionItem | null>(null);

  // Collect Payment Form
  const [pGuestName, setPGuestName] = useState('');
  const [pRoomNo, setPRoomNo] = useState('');
  const [pAmount, setPAmount] = useState<number>(75000);
  const [pCategory, setPCategory] = useState<'Hébergement' | 'Restauration' | 'Autre Activité'>('Hébergement');
  const [pMethod, setPMethod] = useState<'Wave' | 'Orange Money' | 'Espèces' | 'Carte Bancaire' | 'Virement'>('Wave');
  const [pRef, setPRef] = useState('');
  const [pStatus, setPStatus] = useState<'Confirmé' | 'Acompte'>('Confirmé');

  // Record Expense Form
  const [eLabel, setELabel] = useState('');
  const [eAmount, setEAmount] = useState<number>(25000);
  const [eCategory, setECategory] = useState<'Ménage & Blanchisserie' | 'Maintenance' | 'Marketing & Promo' | 'Taxes & Patentes' | 'Restauration' | 'Autre Activité'>('Maintenance');
  const [eMethod, setEMethod] = useState<'Wave' | 'Orange Money' | 'Espèces' | 'Carte Bancaire' | 'Virement'>('Espèces');
  const [eRef, setERef] = useState('');

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Convert number to Senegalese FCFA format
  const formatValue = (val: number) => {
    return `${val.toLocaleString('fr-FR')} FCFA`;
  };

  // Handle Add Income Payment
  const handleCollectPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pGuestName.trim() || pAmount <= 0) {
      triggerToast("Veuillez remplir correctement les informations de base.");
      return;
    }

    const newTx: TransactionItem = {
      id: `TX-2026-${100 + transactions.length + 1}`,
      guestName: pGuestName.trim(),
      roomNo: pRoomNo.trim() || 'N/A',
      amount: pAmount,
      date: new Date().toISOString().split('T')[0],
      type: 'Entrée',
      category: pCategory,
      method: pMethod,
      status: pStatus,
      referenceCode: pRef.trim() || undefined
    };

    setTransactions([newTx, ...transactions]);
    setShowPaymentModal(false);

    // Reset fields
    setPGuestName('');
    setPRoomNo('');
    setPAmount(75000);
    setPRef('');

    onAddNotification(
      "Paiement encaissé",
      `${formatValue(pAmount)} collecté de ${pGuestName} via ${pMethod}.`,
      'paiement'
    );
    triggerToast(`Paiement de ${formatValue(pAmount)} enregistré avec succès !`);
  };

  // Handle Add Expense
  const handleRecordExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eLabel.trim() || eAmount <= 0) {
      triggerToast("Veuillez renseigner un libellé de dépense valide.");
      return;
    }

    if (currentRole === 'Réceptionniste (Front Desk)') {
      triggerToast("Accès refusé : Le Réceptionniste n'est pas autorisé à engager des dépenses opérationnelles.");
      return;
    }

    const newTx: TransactionItem = {
      id: `TX-2026-${100 + transactions.length + 1}`,
      guestName: eLabel.trim(),
      roomNo: 'N/A',
      amount: eAmount,
      date: new Date().toISOString().split('T')[0],
      type: 'Sortie',
      category: eCategory,
      method: eMethod,
      status: 'Confirmé',
      referenceCode: eRef.trim() || undefined
    };

    setTransactions([newTx, ...transactions]);
    setShowExpenseModal(false);

    // Reset fields
    setELabel('');
    setEAmount(25000);
    setERef('');

    onAddNotification(
      "Dépense enregistrée",
      "Sortie de caisse de " + formatValue(eAmount) + " pour : " + eLabel,
      'paiement'
    );
    triggerToast(`Dépense de ${formatValue(eAmount)} comptabilisée.`);
  };

  // Approve pending transaction (e.g. Virement or Cheque transition)
  const handleApproveTransaction = (txId: string) => {
    if (currentRole === 'Responsable Ménage' || currentRole === 'Réceptionniste (Front Desk)') {
      triggerToast("Droits insuffisants. Seul le Directeur Financier ou Propriétaire peut valider des fonds en attente.");
      return;
    }

    setTransactions(prev => prev.map(t => {
      if (t.id === txId) {
        return { ...t, status: 'Confirmé' };
      }
      return t;
    }));

    const tx = transactions.find(t => t.id === txId);
    if (tx) {
      onAddNotification(
        "Fonds validés",
        `La transaction ${txId} (${formatValue(tx.amount)}) a été validée d'un statut "En attente" à "Confirmé".`,
        'paiement'
      );
    }
    triggerToast(`Transaction ${txId} confirmée.`);
  };

  // Delete transaction log
  const handleDeleteTransaction = (txId: string) => {
    if (currentRole !== "Propriétaire d'Hôtel") {
      triggerToast("Opération interdite : Seul le Propriétaire de l'établissement peut effacer un journal d'écriture financière.");
      return;
    }

    setTransactions(prev => prev.filter(t => t.id !== txId));
    setDeleteConfirmId(null);
    triggerToast(`Transaction éditée et supprimée du bilan PMS.`);
  };

  // Filters calculation
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.guestName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            t.roomNo.includes(searchQuery) || 
                            t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (t.referenceCode && t.referenceCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            t.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = typeFilter === 'Tous' || t.type === typeFilter;
      const matchesMethod = methodFilter === 'Tous' || t.method === methodFilter;

      return matchesSearch && matchesType && matchesMethod;
    });
  }, [transactions, searchQuery, typeFilter, methodFilter]);

  // Statistical financial metrics computed globally
  const financeMetrics = useMemo(() => {
    const activeTx = filteredTransactions;
    const grossIncome = activeTx.filter(t => t.type === 'Entrée' && t.status !== 'Remboursé').reduce((acc, curr) => acc + curr.amount, 0);
    const expenses = activeTx.filter(t => t.type === 'Sortie').reduce((acc, curr) => acc + curr.amount, 0);
    const netCashflow = grossIncome - expenses;

    // Local payment method distributions
    const waveRevenues = activeTx.filter(t => t.type === 'Entrée' && t.method === 'Wave').reduce((acc, curr) => acc + curr.amount, 0);
    const omRevenues = activeTx.filter(t => t.type === 'Entrée' && t.method === 'Orange Money').reduce((acc, curr) => acc + curr.amount, 0);
    const cashRevenues = activeTx.filter(t => t.type === 'Entrée' && t.method === 'Espèces').reduce((acc, curr) => acc + curr.amount, 0);

    const pendingFonds = activeTx.filter(t => t.status === 'En attente' || t.status === 'Acompte').reduce((acc, curr) => acc + curr.amount, 0);

    return { grossIncome, expenses, netCashflow, waveRevenues, omRevenues, cashRevenues, pendingFonds };
  }, [filteredTransactions]);

  return (
    <div className="space-y-6 fade-in-up">
      
      {/* Toast popup */}
      {toast && (
        <div className="bg-[#09153D] text-white px-4 py-3.5 rounded-[18px] text-xs font-bold shadow-lg flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 duration-250 fixed top-6 right-6 z-50 max-w-sm border border-slate-700/60">
          <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
          <span className="leading-snug text-left">{toast}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#09153D] tracking-tight font-sans">Paiements, Caisse & Finance</h2>
          <p className="text-xs text-slate-400 font-medium">Contrôle des flux d’entrées, frais d’exploitation hôteliers, statistiques de caisse Mobile Money (Wave, OM)</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentRole !== 'Responsable Ménage' ? (
            <>
              {/* Record Income */}
              <button
                onClick={() => setShowPaymentModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-600/10"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Encaisser Recette (Wave/CBI)</span>
              </button>

              {/* Record Expense */}
              {currentRole !== 'Réceptionniste (Front Desk)' && (
                <button
                  onClick={() => setShowExpenseModal(true)}
                  className="bg-red-650 hover:bg-red-700 text-white font-extrabold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-red-600/10"
                >
                  <ArrowDownRight className="w-4 h-4" />
                  <span>Saisir Dépense Exploitation</span>
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200/50 rounded-xl text-[10px] font-bold text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>Droits financiers verrouillés (Ménage)</span>
            </div>
          )}
        </div>
      </div>

      {/* FINANCE KEY PERFORMANCE INDICATORS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
        
        {/* KPI 1: Gross revenues */}
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm text-left">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Recettes Brutes</span>
            <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <h4 className="text-xl font-black text-[#09153D] font-mono mt-3 truncate">
            {formatValue(financeMetrics.grossIncome)}
          </h4>
          <span className="text-[9.5px] text-emerald-600 font-extrabold block mt-1">Cumulé du jour</span>
        </div>

        {/* KPI 2: Expenses */}
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm text-left">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Charges Hôtelières</span>
            <span className="p-2.5 bg-red-50 text-red-600 rounded-xl">
              <ArrowDownRight className="w-4 h-4" />
            </span>
          </div>
          <h4 className="text-xl font-black text-[#09153D] font-mono mt-3 truncate">
            {formatValue(financeMetrics.expenses)}
          </h4>
          <span className="text-[9.5px] text-red-500 font-extrabold block mt-1">Fournisseurs & Maintenance</span>
        </div>

        {/* KPI 3: Cashflow result */}
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm text-left">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest">Solde Net Trésorerie</span>
            <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <h4 className="text-xl font-black text-[#09153D] font-mono mt-3 truncate">
            {formatValue(financeMetrics.netCashflow)}
          </h4>
          <span className="text-[9.5px] text-slate-400 font-medium block mt-1">Bénéfice opérationnel net</span>
        </div>

        {/* KPI 4: Pending / Unsettled */}
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm text-left">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Créances Restantes</span>
            <span className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <h4 className="text-xl font-black text-[#09153D] font-mono mt-3 truncate">
            {formatValue(financeMetrics.pendingFonds)}
          </h4>
          <span className="text-[9.5px] text-amber-600 font-bold block mt-1">En attente d'approbation</span>
        </div>

      </div>

      {/* MOBILE CASH & TRANSACTION TYPES DISTRIBUTION OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full text-left">
        
        {/* Left distribution: Mobile Money highlights */}
        <div className="lg:col-span-4 bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
          <div>
            <h4 className="text-xs font-bold font-sans text-slate-400 uppercase tracking-wider">Répartition Encaissements (Mobile)</h4>
            <p className="text-[11px] text-slate-400">Aperçu direct de la répartition du numéraire de caisse à {currentHotel}</p>
          </div>

          <div className="space-y-3.5 pt-1">
            
            {/* Wave Senegal */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-sky-500 inline-block shrink-0" />
                  Wave Sénégal (Bleu)
                </span>
                <span className="font-bold font-mono text-slate-600">{formatValue(financeMetrics.waveRevenues)}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-sky-500 h-full rounded-full transition-all" 
                  style={{ width: `${financeMetrics.grossIncome > 0 ? (financeMetrics.waveRevenues / financeMetrics.grossIncome) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Orange Money */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-orange-500 inline-block shrink-0" />
                  Orange Money 
                </span>
                <span className="font-bold font-mono text-slate-600">{formatValue(financeMetrics.omRevenues)}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-orange-600 h-full rounded-full transition-all" 
                  style={{ width: `${financeMetrics.grossIncome > 0 ? (financeMetrics.omRevenues / financeMetrics.grossIncome) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Cash */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block shrink-0" />
                  Espèces Liquide
                </span>
                <span className="font-bold font-mono text-slate-600">{formatValue(financeMetrics.cashRevenues)}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all" 
                  style={{ width: `${financeMetrics.grossIncome > 0 ? (financeMetrics.cashRevenues / financeMetrics.grossIncome) * 100 : 0}%` }}
                />
              </div>
            </div>

          </div>

          <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
            <span>Données extraites des terminaux POS</span>
            <span className="text-orange-600 font-bold">100% Synchronisé</span>
          </div>

        </div>

        {/* Right filter panel & search bar */}
        <div className="lg:col-span-8 bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
          <div>
            <h4 className="text-xs font-bold font-sans text-[#09153D] uppercase tracking-wider">Moteur de Recherches & Règlements</h4>
            <p className="text-[11px] text-slate-400">Filtrez vos opérations par types, mot-clés ou méthode Mobile Money</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Search Input text */}
            <div className="space-y-1.5">
              <label className="block text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest">Rechercher libellé, client, ID :</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ex : Alastair, TX..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 text-xs px-9 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Type filter button tabs */}
            <div className="space-y-1.5">
              <label className="block text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest">Type d'opération :</label>
              <div className="flex bg-slate-50 p-0.5 rounded-lg border border-slate-100 select-none">
                {(['Tous', 'Entrée', 'Sortie'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setTypeFilter(f)}
                    className={`flex-1 text-[10px] font-extrabold py-1.8 rounded-md transition-all cursor-pointer ${
                      typeFilter === f ? 'bg-white text-[#09153D] shadow-sm font-black' : 'text-slate-450 hover:text-slate-650'
                    }`}
                  >
                    {f === 'Tous' ? 'TOUS' : f === 'Entrée' ? 'RECETTE' : 'DÉPENSE'}
                  </button>
                ))}
              </div>
            </div>

            {/* Method Filter select */}
            <div className="space-y-1.5">
              <label className="block text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest">Méthode de Paiement :</label>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 p-2 rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="Tous">Tous modes confondus</option>
                <option value="Wave">Wave Sénégal</option>
                <option value="Orange Money">Orange Money</option>
                <option value="Espèces">Espèces (Liquide)</option>
                <option value="Carte Bancaire">Carte Bancaire Visa</option>
                <option value="Virement">Virement (CBI / BICIS)</option>
              </select>
            </div>

          </div>
        </div>

      </div>

      {/* CORE FINANCIAL JOURNAL LIST */}
      <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm text-left">
        
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h4 className="text-sm font-bold text-[#09153D]">Journal Financier de l’hôtel (Bilan PMS)</h4>
            <p className="text-[11px] text-slate-400 font-medium">Revue auditée des encaissements et décaissements opérationnels pour {currentHotel}</p>
          </div>
          
          <span className="text-[10px] font-bold font-mono text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full">
            {filteredTransactions.length} Écritures affichées
          </span>
        </div>

        {/* Journal Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100 text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="p-4 text-left w-28">OPERATION REF</th>
                <th className="p-4 text-left">DATE</th>
                <th className="p-4 text-left">LIBELLÉ / CLIENT</th>
                <th className="p-4 text-center">CH. N°</th>
                <th className="p-4 text-left">CATÉGORIE</th>
                <th className="p-4 text-left">MÉTHODE</th>
                <th className="p-4 text-right">MONTANT</th>
                <th className="p-4 text-center">STATUT BILLING</th>
                <th className="p-4 text-center">ACTIONS AUDIT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400 italic">
                    Aucune entrée financière dans l'historique répondant aux critères à {currentHotel}.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50/20 transition-colors">
                    
                    {/* ID */}
                    <td className="p-4 text-left font-bold font-mono text-[#09153D]">
                      {tx.id}
                    </td>

                    {/* Date */}
                    <td className="p-4 text-left text-slate-500 font-mono">
                      {tx.date}
                    </td>

                    {/* Libellé */}
                    <td className="p-4 text-left">
                      <div>
                        <span className="font-extrabold text-slate-850 block">{tx.guestName}</span>
                        {tx.referenceCode && (
                          <span className="text-[9.5px] text-slate-400 font-mono block mt-0.5">Code POS : {tx.referenceCode}</span>
                        )}
                      </div>
                    </td>

                    {/* Chamber number */}
                    <td className="p-4 text-center font-mono font-bold text-slate-500">
                      {tx.roomNo}
                    </td>

                    {/* Category tag */}
                    <td className="p-4 text-left">
                      <span className="inline-block text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                        {tx.category}
                      </span>
                    </td>

                    {/* Method */}
                    <td className="p-4 text-left">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${
                        tx.method === 'Wave' ? 'text-sky-600' :
                        tx.method === 'Orange Money' ? 'text-orange-600' :
                        tx.method === 'Espèces' ? 'text-emerald-700' :
                        'text-indigo-600'
                      }`}>
                        <Wallet className="w-3.5 h-3.5 shrink-0" />
                        {tx.method}
                      </span>
                    </td>

                    {/* Amount value */}
                    <td className="p-4 text-right">
                      <span className={`font-black font-mono text-sm ${
                        tx.type === 'Entrée' ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        {tx.type === 'Entrée' ? '+' : '-'}{tx.amount.toLocaleString('fr-FR')} F
                      </span>
                    </td>

                    {/* billing status */}
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 font-extrabold text-[9px] px-2 py-0.5 rounded-full ${
                        tx.status === 'Confirmé' ? 'bg-emerald-50 text-emerald-600' :
                        tx.status === 'Acompte' ? 'bg-blue-50 text-blue-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${
                          tx.status === 'Confirmé' ? 'bg-emerald-500' :
                          tx.status === 'Acompte' ? 'bg-blue-500' :
                          'bg-amber-500'
                        }`} />
                        {tx.status.toUpperCase()}
                      </span>
                    </td>

                    {/* Audit actions */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Quick receipt download/view invoice button */}
                        <button
                          onClick={() => setInvoicePreviewData(tx)}
                          className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 p-1.5 rounded-lg transition-transform cursor-pointer"
                          title="Générer reçu d'encaissement"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>

                        {/* If pending/unsettled -> trigger confirmation */}
                        {tx.status === 'En attente' && currentRole !== 'Responsable Ménage' && (
                          <button
                            onClick={() => handleApproveTransaction(tx.id)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="Confirmer encaissement des fonds"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Owner only master delete */}
                        {currentRole === "Propriétaire d'Hôtel" && (
                          deleteConfirmId === tx.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteTransaction(tx.id)}
                                className="text-[10px] font-bold bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-lg cursor-pointer"
                              >
                                Confirmer
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-lg cursor-pointer"
                              >
                                Non
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(tx.id)}
                              className="bg-red-50 hover:bg-red-100/80 border border-red-100 text-red-500 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="Retirer cette écriture comptable"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* 5. INCOME COLLECTION PAYMENT MODAL OVERLAY */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-[#09153D]/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] border border-slate-150/80 shadow-2xl max-w-md w-full overflow-hidden text-left animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-emerald-650 to-teal-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Wallet className="w-5.5 h-5.5 text-white animate-pulse" />
                <div>
                  <h3 className="font-extrabold text-white text-md tracking-tight">Guichet Encaissement</h3>
                  <p className="text-[10px] text-teal-100 font-medium">Bases directes - Financement hôtelier</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="text-white hover:text-teal-200 cursor-pointer text-sm font-bold bg-white/10 w-7 h-7 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCollectPaymentSubmit} className="p-6 space-y-4">
              
              {/* Customer */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Nom du Client / Source Recette :
                </label>
                <input
                  type="text"
                  placeholder="Ex : Alastair Cook, Restô bar..."
                  value={pGuestName}
                  onChange={(e) => setPGuestName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Room & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Chambre N° :
                  </label>
                  <input
                    type="text"
                    placeholder="Ex : 104, N/A..."
                    value={pRoomNo}
                    onChange={(e) => setPRoomNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-mono font-bold p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Poste Recette :
                  </label>
                  <select
                    value={pCategory}
                    onChange={(e) => setPCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-705 p-3 rounded-xl cursor-pointer focus:outline-none"
                  >
                    <option value="Hébergement">Hébergement</option>
                    <option value="Restauration">Restauration</option>
                    <option value="Autre Activité">Autre Activité</option>
                  </select>
                </div>
              </div>

              {/* Amount and status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Somme Net (FCFA) :
                  </label>
                  <input
                    type="number"
                    min={500}
                    step={100}
                    value={pAmount}
                    onChange={(e) => setPAmount(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-emerald-700 p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Règlement encours :
                  </label>
                  <select
                    value={pStatus}
                    onChange={(e) => setPStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-705 p-3 rounded-xl cursor-pointer focus:outline-none"
                  >
                    <option value="Confirmé">Totalement prépayé</option>
                    <option value="Acompte">Acompte d’arrhes (50%)</option>
                  </select>
                </div>
              </div>

              {/* Method and reference code */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Passerelle :
                  </label>
                  <select
                    value={pMethod}
                    onChange={(e) => setPMethod(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-[#09153D] p-3 rounded-xl cursor-pointer focus:outline-none"
                  >
                    <option value="Wave">Wave Sénégal (Bleu)</option>
                    <option value="Orange Money">Orange Money</option>
                    <option value="Espèces">Espèces (Livide)</option>
                    <option value="Carte Bancaire">Carte Bancaire Visa</option>
                    <option value="Virement">Virement (CBI / BOA)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Id/Réf. de Transaction :
                  </label>
                  <input
                    type="text"
                    placeholder="Ex : OM-293812"
                    value={pRef}
                    onChange={(e) => setPRef(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-mono p-3 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit footer */}
              <div className="pt-4 border-t border-slate-50 flex items-center justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4.5 py-3 hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-colors cursor-pointer shadow-md shadow-emerald-500/10"
                >
                  Confirmer l'Encaissement
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 6. EXPENSE RECORD MODAL OVERLAY */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-[#09153D]/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] border border-slate-150/80 shadow-2xl max-w-md w-full overflow-hidden text-left animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-red-650 to-orange-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ArrowDownRight className="w-5.5 h-5.5 text-white" />
                <div>
                  <h3 className="font-extrabold text-white text-md tracking-tight">Déclaration de Décaissement</h3>
                  <p className="text-[10px] text-red-100 font-medium">Bases directes - Charges & Maintenance hôtelière</p>
                </div>
              </div>
              <button 
                onClick={() => setShowExpenseModal(false)}
                className="text-white hover:text-red-200 cursor-pointer text-sm font-bold bg-white/10 w-7 h-7 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRecordExpenseSubmit} className="p-6 space-y-4">
              
              {/* Libellé */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Nature de la dépense / Libellé :
                </label>
                <input
                  type="text"
                  placeholder="Ex : Blanchisserie, Achat fruits, Carburant groupe élec..."
                  value={eLabel}
                  onChange={(e) => setELabel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500"
                  required
                />
              </div>

              {/* Amount & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Somme Décaissée (FCFA) :
                  </label>
                  <input
                    type="number"
                    min={100}
                    step={100}
                    value={eAmount}
                    onChange={(e) => setEAmount(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-red-650 p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Poste Budgétaire :
                  </label>
                  <select
                    value={eCategory}
                    onChange={(e) => setECategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-705 p-3 rounded-xl cursor-pointer focus:outline-none"
                  >
                    <option value="Ménage & Blanchisserie">Ménage & Blanchisserie</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Restauration">Restauration</option>
                    <option value="Marketing & Promo">Marketing & Promo</option>
                    <option value="Taxes & Patentes">Taxes & Patentes</option>
                    <option value="Autre Activité">Autre Activité</option>
                  </select>
                </div>
              </div>

              {/* Method and reference */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Mode d'Acquittement :
                  </label>
                  <select
                    value={eMethod}
                    onChange={(e) => setEMethod(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-705 p-3 rounded-xl cursor-pointer focus:outline-none"
                  >
                    <option value="Espèces">Espèces (Liquide caisse)</option>
                    <option value="Wave">Wave Corporate</option>
                    <option value="Orange Money">Orange Money</option>
                    <option value="Virement">Virement (CBI)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    N° de Facture d'appui :
                  </label>
                  <input
                    type="text"
                    placeholder="Ex : FACT-2026-F9"
                    value={eRef}
                    onChange={(e) => setERef(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-mono p-3 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit footer */}
              <div className="pt-4 border-t border-slate-50 flex items-center justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4.5 py-3 hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl transition-colors cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  className="bg-red-650 hover:bg-red-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-colors cursor-pointer shadow-md shadow-red-500/10"
                >
                  Enregistrer la Dépense
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 7. PREVIEW RECEIPT MODAL OVERLAY */}
      {invoicePreviewData && (
        <div className="fixed inset-0 z-50 bg-[#09153D]/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] border border-slate-150/80 shadow-2xl max-w-sm w-full overflow-hidden text-left animate-in zoom-in-95 duration-200">
            
            {/* Modal Head */}
            <div className="p-4 bg-[#09153D] text-white flex items-center justify-between">
              <span className="text-[10px] font-bold font-mono text-slate-300">REÇU DE CAISSE PMS</span>
              <button 
                onClick={() => setInvoicePreviewData(null)}
                className="text-white hover:text-slate-300 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* Letterhead and printable content */}
            <div className="p-6 space-y-6 bg-slate-50/50">
              
              {/* Hotel letterhead banner */}
              <div className="text-center space-y-1">
                <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center font-bold text-white text-xs mx-auto">
                  SH
                </div>
                <h4 className="font-extrabold text-[#09153D] text-sm mt-2">SÉNÉGAL HOTELS GROUP</h4>
                <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-widest">{currentHotel}</p>
                <p className="text-[8.5px] text-slate-400">Saly Portudal / Ziguinchor, Sénégal</p>
              </div>

              {/* Details of the voucher */}
              <div className="border-t border-b border-dashed border-slate-200 py-4.5 space-y-2.5 text-xs">
                
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Bordereau :</span>
                  <span className="font-mono font-bold text-[#09153D]">{invoicePreviewData.id}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Date d'édition :</span>
                  <span className="font-mono font-bold">{invoicePreviewData.date}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Voyageur / Tiers :</span>
                  <span className="font-extrabold text-slate-800">{invoicePreviewData.guestName}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Chambre assignée :</span>
                  <span className="font-mono font-extrabold">Chambre {invoicePreviewData.roomNo}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Poste Budget :</span>
                  <span className="font-mono">{invoicePreviewData.category}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Passerelle POS :</span>
                  <span className="font-mono font-bold text-orange-600">{invoicePreviewData.method}</span>
                </div>

                {invoicePreviewData.referenceCode && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Réf. transaction :</span>
                    <span className="font-mono text-[10.5px] text-slate-500 font-bold">{invoicePreviewData.referenceCode}</span>
                  </div>
                )}

              </div>

              {/* Total Summary */}
              <div className="bg-[#09153D]/5 p-4 rounded-xl flex items-center justify-between text-left">
                <div>
                  <span className="block text-[9.5px] font-extrabold text-slate-450 uppercase tracking-wide">MONTANT RÈGLÉ :</span>
                  <span className="text-[9px] text-[#09153D]/70 font-bold">Acquittement immédiat</span>
                </div>
                <div className="text-right">
                  <span className="text-md font-black text-[#09153D] font-mono leading-none">
                    {formatValue(invoicePreviewData.amount)}
                  </span>
                </div>
              </div>

              {/* Printing alert notification helper */}
              <div className="flex items-start gap-2 bg-amber-50 rounded-xl p-3 border border-amber-100/50">
                <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-900 leading-normal">
                  Ce bon fait foi de reçu libératoire d'acquittement pour les prestations précitées. Reçu certifié par la direction du groupe.
                </p>
              </div>

              {/* Bottom Print / close actions */}
              <div className="flex items-center gap-2 select-none">
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="flex-1 bg-[#09153D] hover:bg-[#122A65] text-white font-extrabold text-[10.5px] py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Imprimer en direct</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInvoicePreviewData(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10.5px] py-2.5 px-4 rounded-xl cursor-pointer"
                >
                  Fermer
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
