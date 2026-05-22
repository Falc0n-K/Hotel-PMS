/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Settings, 
  Save, 
  Globe, 
  Bell, 
  Shield, 
  Database, 
  CreditCard, 
  RefreshCw, 
  Sliders, 
  Sparkles, 
  CheckCircle2, 
  Server, 
  HelpCircle,
  Wifi,
  ChevronRight,
  Sun,
  History,
  Clock,
  ArrowRight
} from 'lucide-react';
import { RBACRole } from '../types';

interface SettingChange {
  id: string;
  field: string;
  previousValue: string;
  newValue: string;
  user: string;
  role: RBACRole;
  timestamp: string;
}

interface GlobalSettingsProps {
  currentHotel: string;
  currentRole: RBACRole;
  onAddNotification: (title: string, message: string, type: 'réservation' | 'paiement' | 'alerte' | 'info') => void;
}

export default function GlobalSettings({
  currentHotel,
  currentRole,
  onAddNotification
}: GlobalSettingsProps) {

  // Strict check for permissions
  if (currentRole !== 'Propriétaire d\'Hôtel' && currentRole !== 'Directeur Financier') {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm max-w-2xl mx-auto my-12 fade-in-up flex flex-col items-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-6">
          <Shield className="w-8 h-8 text-rose-500" />
        </div>
        <h3 className="text-sm font-extrabold text-[#09153D] font-sans">Accès Interdit • Profil Non Autorisé</h3>
        <p className="text-xs text-slate-500 mt-2 max-w-md leading-relaxed text-center">
          La modification des paramètres fondamentaux du PMS (taux de TVA, devises, interconnexions OTA Booking/Expedia, synchronisations serveurs) de l'établissement <strong>{currentHotel}</strong> est réservée exclusivement à la direction. Votre rôle actuel (<strong>{currentRole}</strong>) n'a pas les droits requis.
        </p>
      </div>
    );
  }

  // Current Hotel PMS Settings State
  const [currency, setCurrency] = useState<'FCFA' | 'EUR' | 'USD'>('FCFA');
  const [taxRate, setTaxRate] = useState<number>(10); // Senegal tourist flat/VAT percentage
  const [otaSyncEnabled, setOtaSyncEnabled] = useState<boolean>(true);
  const [breakfastPrice, setBreakfastPrice] = useState<number>(7500); // Francs CFA
  const [roomAutomation, setRoomAutomation] = useState<boolean>(true);
  const [backupInterval, setBackupInterval] = useState<'hourly' | 'daily' | 'weekly'>('daily');
  const [criticalAlertsEnabled, setCriticalAlertsEnabled] = useState<boolean>(true);
  
  // Maintain initial original settings for tracking diffs
  const [originalSettings, setOriginalSettings] = useState({
    currency: 'FCFA' as 'FCFA' | 'EUR' | 'USD',
    taxRate: 10,
    otaSyncEnabled: true,
    breakfastPrice: 7500,
    roomAutomation: true,
    backupInterval: 'daily' as 'hourly' | 'daily' | 'weekly'
  });

  // Settings modification history list
  const [history, setHistory] = useState<SettingChange[]>([
    {
      id: "HIST-0",
      field: "Synchronisation Directe",
      previousValue: "Déclenchée manuellement",
      newValue: "Succès (3 OTA à jour)",
      user: "Mamadou Diallo",
      role: "Propriétaire d'Hôtel",
      timestamp: "22/05/2026, 10:45"
    },
    {
      id: "HIST-1",
      field: "Devise d'Affichage PMS",
      previousValue: "EUR (€)",
      newValue: "FCFA (Franc CFA)",
      user: "Fatou Diome",
      role: "Directeur Financier",
      timestamp: "22/05/2026, 09:12"
    },
    {
      id: "HIST-2",
      field: "Taxe Touristique / TVA",
      previousValue: "8 %",
      newValue: "10 %",
      user: "Fatou Diome",
      role: "Directeur Financier",
      timestamp: "21/05/2026, 16:45"
    },
    {
      id: "HIST-3",
      field: "Gestionnaire de Sinc (OTA)",
      previousValue: "Désactivé",
      newValue: "Activé",
      user: "Mamadou Diallo",
      role: "Propriétaire d'Hôtel",
      timestamp: "20/05/2026, 14:15"
    }
  ]);
  
  // Simulated connection status
  const [isSyncingChannels, setIsSyncingChannels] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Channel sync simulate
  const handleSyncOTAsNow = () => {
    setIsSyncingChannels(true);
    setTimeout(() => {
      setIsSyncingChannels(false);
      onAddNotification(
        "Canaux de réservation synchronisés",
        `Les plannings de ${currentHotel} ont été synchronisés avec Booking.com, Airbnb et Expedia.`,
        "info"
      );

      const now = new Date();
      const formattedDate = now.toLocaleDateString('fr-FR') + ', ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const activeUser = currentRole === 'Propriétaire d\'Hôtel' ? 'Mamadou Diallo' : 'Fatou Diome';

      setHistory(prev => [
        {
          id: `HIST-${Date.now()}-sync-manual`,
          field: "Synchronisation Directe",
          previousValue: "Lancement manuel",
          newValue: "Succès (3 OTA à jour)",
          user: activeUser,
          role: currentRole as any,
          timestamp: formattedDate
        },
        ...prev
      ]);

      triggerToast("Les calendriers OTA de Booking et Airbnb ont été mis à jour avec le PMS !");
    }, 1500);
  };

  // Save Settings
  const handleSaveAllSettings = (e: React.FormEvent) => {
    e.preventDefault();

    // Check RBAC Permissions
    if (currentRole !== 'Propriétaire d\'Hôtel' && currentRole !== 'Directeur Financier') {
      triggerToast("Accès refusé : Seule la Direction hôtelière ou le Propriétaire peut modifier le paramétrage global des PMS.");
      return;
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString('fr-FR') + ', ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const activeUser = currentRole === 'Propriétaire d\'Hôtel' ? 'Mamadou Diallo' : 'Fatou Diome';

    const newChanges: SettingChange[] = [];

    if (currency !== originalSettings.currency) {
      newChanges.push({
        id: `HIST-${Date.now()}-curr`,
        field: "Devise d'Affichage PMS",
        previousValue: originalSettings.currency === 'FCFA' ? 'FCFA (Franc CFA)' : originalSettings.currency === 'EUR' ? 'EUR (€)' : 'USD ($)',
        newValue: currency === 'FCFA' ? 'FCFA (Franc CFA)' : currency === 'EUR' ? 'EUR (€)' : 'USD ($)',
        user: activeUser,
        role: currentRole as any,
        timestamp: formattedDate
      });
    }

    if (taxRate !== originalSettings.taxRate) {
      newChanges.push({
        id: `HIST-${Date.now()}-tax`,
        field: "Taxe Touristique / TVA",
        previousValue: `${originalSettings.taxRate} %`,
        newValue: `${taxRate} %`,
        user: activeUser,
        role: currentRole as any,
        timestamp: formattedDate
      });
    }

    if (otaSyncEnabled !== originalSettings.otaSyncEnabled) {
      newChanges.push({
        id: `HIST-${Date.now()}-ota`,
        field: "Gestionnaire de Sinc (OTA)",
        previousValue: originalSettings.otaSyncEnabled ? "Activé" : "Désactivé",
        newValue: otaSyncEnabled ? "Activé" : "Désactivé",
        user: activeUser,
        role: currentRole as any,
        timestamp: formattedDate
      });
    }

    if (breakfastPrice !== originalSettings.breakfastPrice) {
      newChanges.push({
        id: `HIST-${Date.now()}-breakfast`,
        field: "Prix du Petit-Déjeuner",
        previousValue: `${originalSettings.breakfastPrice.toLocaleString('fr-FR')} ${originalSettings.currency}`,
        newValue: `${breakfastPrice.toLocaleString('fr-FR')} ${currency}`,
        user: activeUser,
        role: currentRole as any,
        timestamp: formattedDate
      });
    }

    if (roomAutomation !== originalSettings.roomAutomation) {
      newChanges.push({
        id: `HIST-${Date.now()}-auto`,
        field: "Contrôle Domotique",
        previousValue: originalSettings.roomAutomation ? "Activé" : "Désactivé",
        newValue: roomAutomation ? "Activé" : "Désactivé",
        user: activeUser,
        role: currentRole as any,
        timestamp: formattedDate
      });
    }

    if (backupInterval !== originalSettings.backupInterval) {
      const getLabel = (v: string) => v === 'hourly' ? 'Chaque heure' : v === 'daily' ? 'Chaque jour' : 'Chaque semaine';
      newChanges.push({
        id: `HIST-${Date.now()}-back`,
        field: "Intervalle d'Archive",
        previousValue: getLabel(originalSettings.backupInterval),
        newValue: getLabel(backupInterval),
        user: activeUser,
        role: currentRole as any,
        timestamp: formattedDate
      });
    }

    if (newChanges.length > 0) {
      setHistory(prev => [...newChanges, ...prev]);
      setOriginalSettings({
        currency,
        taxRate,
        otaSyncEnabled,
        breakfastPrice,
        roomAutomation,
        backupInterval
      });
      triggerToast(`${newChanges.length} configuration(s) enregistrée(s) dans l'historique !`);
    } else {
      triggerToast("Tous les réglages de la Téranga ont été appliqués (aucun changement) !");
    }

    onAddNotification(
      "Configuration PMS actualisée",
      `Les paramètres globaux de l'hôtel ${currentHotel} ont été sauvegardés.`,
      "info"
    );
  };

  // Trigger Local Database Backup
  const handleTriggerBackup = () => {
    onAddNotification(
      "Sauvegarde PMS effectuée",
      `Le fichier général d'historique de ${currentHotel} a été exporté en cloud sécurisé.`,
      "info"
    );

    const now = new Date();
    const formattedDate = now.toLocaleDateString('fr-FR') + ', ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const activeUser = currentRole === 'Propriétaire d\'Hôtel' ? 'Mamadou Diallo' : 'Fatou Diome';

    setHistory(prev => [
      {
        id: `HIST-${Date.now()}-cloudback`,
        field: "Sauvegarde Cloud PMS",
        previousValue: "Backup programmée",
        newValue: "Sauvegarde d'urgence réussie",
        user: activeUser,
        role: currentRole as any,
        timestamp: formattedDate
      },
      ...prev
    ]);

    triggerToast("Base de données sauvegardée dans les serveurs Cloud Sénégal Hôtels !");
  };

  return (
    <div className="space-y-6 fade-in-up">

      {/* Dynamic Toast feedback */}
      {toastMessage && (
        <div className="bg-[#09153D] text-white px-4 py-3 rounded-2xl text-xs font-bold shadow-lg flex items-center gap-2 fixed top-6 right-6 z-50 animate-in fade-in duration-200">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left">
          <h2 className="text-2xl font-black text-[#09153D] tracking-tight font-sans">Configuration Globale</h2>
          <p className="text-xs text-slate-400 font-medium font-sans">
            Paramétrage financier, connecteurs Booking/synchro OTA et automatisation de l'hôtel {currentHotel}
          </p>
        </div>

        {/* Sync Trigger button */}
        <button
          onClick={handleSyncOTAsNow}
          disabled={isSyncingChannels}
          className="bg-[#09153D] hover:bg-slate-900 disabled:opacity-60 text-white font-extrabold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncingChannels ? 'animate-spin' : ''}`} />
          <span>{isSyncingChannels ? 'Synchronisation...' : 'Synchroniser les OTA en direct'}</span>
        </button>
      </div>

      {/* CORE CONFIGURATION FORM */}
      <form onSubmit={handleSaveAllSettings} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
        
        {/* LEFT COLUMN: Main Settngs Panels (8 cols) */}
        <div className="lg:col-span-8 space-y-6">

          {/* Panel 1: Currency & Financial configuration */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
            
            <div className="flex items-center gap-2 border-b pb-3 border-slate-50">
              <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-[#09153D] text-sm">Tarification & Fiscalité</h3>
                <p className="text-[10.5px] text-slate-400">Devise de référence et régulation locale au Sénégal</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-2">
              
              {/* Currency field */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Devise d'Affichage PMS :
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-150 py-2.5 px-3 rounded-xl text-xs font-bold focus:outline-none cursor-pointer text-[#09153D]"
                >
                  <option value="FCFA">FCFA (Franc CFA)</option>
                  <option value="EUR">EUR (Euro €)</option>
                  <option value="USD">USD (Dollar $)</option>
                </select>
              </div>

              {/* VAT tax rate */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Taxe Touristique / TVA locale :
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-150 py-2.5 pl-3 pr-8 rounded-xl text-xs font-bold text-[#09153D]"
                  />
                  <span className="text-xs font-bold text-slate-400 absolute right-3 top-1/2 -translate-y-1/2">%</span>
                </div>
              </div>

              {/* Default Breakfast Price */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Prix Petit-Déjeuner par Adulte :
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={breakfastPrice}
                    onChange={(e) => setBreakfastPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-150 py-2.5 pl-3 pr-12 rounded-xl text-xs font-mono font-bold text-[#09153D]"
                  />
                  <span className="text-[10px] font-black text-slate-400 absolute right-3 top-1/2 -translate-y-1/2">{currency}</span>
                </div>
              </div>

            </div>

            <p className="text-[10.5px] text-slate-400 italic leading-relaxed">
              💡 Les modifications de taxes fiscales ne s'appliquent qu'aux nouvelles réservations générées à partir de l'instant t.
            </p>

          </div>

          {/* Panel 2: Integrations & Direct channel synchronisations */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between border-b pb-3 border-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[#09153D] text-sm">Gestionnaire de Sinc (Channel Manager)</h3>
                  <p className="text-[10.5px] text-slate-400">Pont de synchronisation automatique avec les intermédiaires de voyage</p>
                </div>
              </div>

              {/* Toggle switch for OTA synchronization */}
              <button
                type="button"
                onClick={() => setOtaSyncEnabled(!otaSyncEnabled)}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors focus:outline-none shrink-0 ${
                  otaSyncEnabled ? 'bg-orange-600' : 'bg-slate-200'
                }`}
              >
                <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
                  otaSyncEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* List of simulated OTA Connections channels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              
              <div className="p-3.5 border border-slate-100 bg-slate-50/50 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🅱️</span>
                  <div>
                    <h4 className="text-xs font-black text-[#09153D]">Booking.com Direct Connectivity</h4>
                    <span className="text-[10px] text-green-600 font-bold">✓ Synchro temps réel Active</span>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-green-500" />
              </div>

              <div className="p-3.5 border border-slate-100 bg-slate-50/50 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏨</span>
                  <div>
                    <h4 className="text-xs font-black text-[#09153D]">Expedia Quick Connect</h4>
                    <span className="text-[10px] text-green-600 font-bold">✓ iCal rattaché</span>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-green-500" />
              </div>

            </div>

            <div className="p-3 bg-blue-50/50 text-blue-900 border border-blue-100 rounded-xl text-xs leading-relaxed flex items-start gap-2">
              <Sun className="w-4.5 h-4.5 text-blue-700 shrink-0 mt-0.5" />
              <span>
                <strong>Note d'interfaçage :</strong> La synchronisation automatique actualise votre planning de chambres libres toutes les 3 minutes. En cas d'indisponibilité, la cellule de blocage temporaire s'auto-active afin d'éviter les sur-réservations de la saison Téranga.
              </span>
            </div>

          </div>

          {/* Panel 3: Room Automation options */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between border-b pb-3 border-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[#09153D] text-sm">Contrôle Automatisé des Salles (Domotique)</h3>
                  <p className="text-[10.5px] text-slate-400">Intelli-éco électricité des bungalows</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRoomAutomation(!roomAutomation)}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors focus:outline-none shrink-0 ${
                  roomAutomation ? 'bg-orange-600' : 'bg-slate-200'
                }`}
              >
                <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
                  roomAutomation ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <p className="text-xs text-slate-550 leading-relaxed">
              Activez les coupures de climatisation automatiques lors du retrait de la clé d'alimentation de la chambre par le client. Ce réglage réduit en moyenne de 22% les factures énergétiques de Sénégal Hôtels.
            </p>

          </div>

          {/* Form action button submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            
            <button
              type="submit"
              className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-6 py-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-orange-650/10"
            >
              <Save className="w-4 h-4" />
              <span>Sauvegarder les Paramètres Généraux</span>
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: Backup, security & RBAC notes (4 cols) */}
        <div className="lg:col-span-4 space-y-6">

          {/* Back up Panel */}
          <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
            
            <div className="border-b pb-3 border-slate-50">
              <h3 className="font-extrabold text-[#09153D] text-xs uppercase tracking-widest block">Sauvegarde & Restauration</h3>
              <p className="text-[10px] text-slate-400">Intégrité de la base PMS de l'hôtel</p>
            </div>

            <div className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Intervalle d'Archive Automatique :
                </label>
                <select
                  value={backupInterval}
                  onChange={(e) => setBackupInterval(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-150 py-2 px-2.5 rounded-xl text-xs font-bold text-[#09153D] focus:outline-none"
                >
                  <option value="hourly">Chaque heure</option>
                  <option value="daily">Quotidien (Fréquence normale)</option>
                  <option value="weekly">Chaque fin de semaine</option>
                </select>
              </div>

              <div className="flex items-center gap-2 justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 text-xs">
                  <Database className="w-4 h-4 text-slate-400" />
                  <span className="font-bold text-slate-650">Dernier Backup Cloud</span>
                </div>
                <span className="font-mono text-[10px] font-bold text-emerald-600">Aujourd'hui, 06:15</span>
              </div>

              {/* Trigger Instant database backup */}
              <button
                type="button"
                onClick={handleTriggerBackup}
                className="w-full bg-slate-100 hover:bg-slate-200 border text-[#09153D] font-extrabold text-xs py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Server className="w-3.5 h-3.5" />
                <span>Déclencher Backup immédiat</span>
              </button>

            </div>

          </div>

          {/* RBAC constraints disclaimer */}
          <div className="bg-gradient-to-br from-[#09153D] to-[#12245C] text-white p-5 rounded-[24px] shadow-sm relative overflow-hidden select-none">
            <div className="absolute right-0 top-0 opacity-10 font-bold text-7xl">
              ⚙️
            </div>
            
            <div className="space-y-2 relative z-10">
              <span className="text-[10.5px] font-bold text-orange-400 uppercase tracking-widest">Profil de Rôle : {currentRole}</span>
              <h4 className="text-white font-black text-sm">Droits d'Édition PMS sécurisés</h4>
              <p className="text-[11px] text-slate-250 leading-normal">
                Conformément à la politique d'exploitation Sénégal Hôtels, seul le Propriétaire ou la Direction Financière de Saly ou Ziguinchor peuvent enregistrer les devises phares ou reprogrammer la domotique des bungalows. 
              </p>
            </div>
          </div>

        </div>

      </form>

      {/* SECTION: HISTORIQUE DES MODIFICATIONS */}
      <div id="section-historique-modifications" className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
              <History className="w-5 h-5 shrink-0" />
            </div>
            <div className="text-left">
              <h3 className="font-extrabold text-[#09153D] text-sm font-sans">Historique des Modifications</h3>
              <p className="text-[10.5px] text-slate-400 font-medium">Journal d'audit en temps réel des configurations de l'hôtel (TVA, devises, synchronisations)</p>
            </div>
          </div>
          
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full self-start sm:self-auto font-mono">
            {history.length} entrées enregistrées
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-xs text-slate-600 animate-fade-in">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                <th className="py-3 px-4 font-extrabold">Horodatage</th>
                <th className="py-3 px-4 font-extrabold">Configuration</th>
                <th className="py-3 px-4 font-extrabold">Valeur Précédente</th>
                <th className="py-3 px-4 font-extrabold"></th>
                <th className="py-3 px-4 font-extrabold">Nouvelle Valeur</th>
                <th className="py-3 px-4 font-extrabold">Auteur / Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-all font-medium">
                  {/* Timestamp with clock */}
                  <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#09153D]" />
                      <span>{item.timestamp}</span>
                    </div>
                  </td>

                  {/* Config Field Badge */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-[#09153D]/5 text-[#09153D] border border-[#09153D]/10">
                      {item.field}
                    </span>
                  </td>

                  {/* Previous value */}
                  <td className="py-3 px-4 whitespace-nowrap text-slate-400 line-through text-[11px] font-mono">
                    {item.previousValue}
                  </td>

                  {/* Transition icon */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </td>

                  {/* New value badge (accented) */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold bg-green-50 text-green-700 border border-green-150">
                      {item.newValue}
                    </span>
                  </td>

                  {/* Responsible User & Role */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex flex-col text-left">
                      <span className="text-slate-800 text-[11px] font-bold">{item.user}</span>
                      <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">{item.role}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
