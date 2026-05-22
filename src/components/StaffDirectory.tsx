/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Mail, 
  Phone, 
  Briefcase, 
  CalendarDays, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  UserPlus, 
  ShieldAlert, 
  Building2,
  MapPin,
  Clock,
  ExternalLink,
  Edit2,
  Sparkles
} from 'lucide-react';
import { RBACRole } from '../types';

interface StaffDirectoryProps {
  currentHotel: string;
  currentRole: RBACRole;
  onAddNotification: (title: string, message: string, type: 'réservation' | 'paiement' | 'alerte' | 'info') => void;
}

export interface StaffMember {
  id: string;
  name: string;
  roleText: string;
  department: 'Réception' | 'Hébergement & Ménage' | 'Restauration & Bar' | 'Technique & Sécurité' | 'Direction & Admin';
  hotels: ('Royal Saly' | 'Nema Kadior' | 'Les Pélicans du Saloum')[];
  email: string;
  phone: string;
  status: 'Actif' | 'De Garde' | 'En Congé' | 'Absent';
  hireDate: string;
  shiftHours: string;
  baseSalary: number;
}

export default function StaffDirectory({
  currentHotel,
  currentRole,
  onAddNotification
}: StaffDirectoryProps) {

  // Initial staff dataset
  const [staff, setStaff] = useState<StaffMember[]>([
    {
      id: "ST-001",
      name: "Mamadou Diallo",
      roleText: "Directeur Général Adjoint",
      department: "Direction & Admin",
      hotels: ["Royal Saly", "Nema Kadior", "Les Pélicans du Saloum"],
      email: "m.diallo@senegalhotels.sn",
      phone: "+221 77 561 24 39",
      status: "Actif",
      hireDate: "2019-04-15",
      shiftHours: "08:00 - 18:00",
      baseSalary: 1250000
    },
    {
      id: "ST-002",
      name: "Awa Ndiaye",
      roleText: "Régisseur Principal Réception",
      department: "Réception",
      hotels: ["Royal Saly"],
      email: "a.ndiaye@senegalhotels.sn",
      phone: "+221 77 410 89 20",
      status: "Actif",
      hireDate: "2021-08-01",
      shiftHours: "07:00 - 15:00",
      baseSalary: 620000
    },
    {
      id: "ST-003",
      name: "Samba Sow",
      roleText: "Chef de Brigade Technique",
      department: "Technique & Sécurité",
      hotels: ["Royal Saly", "Les Pélicans du Saloum"],
      email: "s.sow@senegalhotels.sn",
      phone: "+221 78 114 90 40",
      status: "De Garde",
      hireDate: "2020-11-10",
      shiftHours: "14:00 - 22:00",
      baseSalary: 450000
    },
    {
      id: "ST-004",
      name: "Fatou Kiné Diop",
      roleText: "Gouvernante Générale",
      department: "Hébergement & Ménage",
      hotels: ["Royal Saly", "Nema Kadior"],
      email: "f.diop@senegalhotels.sn",
      phone: "+221 76 980 12 55",
      status: "Actif",
      hireDate: "2018-02-20",
      shiftHours: "08:00 - 16:30",
      baseSalary: 580000
    },
    {
      id: "ST-005",
      name: "Jean-Pierre Mendy",
      roleText: "Chef de Cuisine et Grillades Océan",
      department: "Restauration & Bar",
      hotels: ["Royal Saly"],
      email: "jp.mendy@senegalhotels.sn",
      phone: "+221 77 319 82 11",
      status: "Actif",
      hireDate: "2022-05-14",
      shiftHours: "11:00 - 22:00",
      baseSalary: 550000
    },
    {
      id: "ST-006",
      name: "Ousmane Fall",
      roleText: "Coordonnateur Escapades & Pirogues",
      department: "Direction & Admin",
      hotels: ["Les Pélicans du Saloum"],
      email: "o.fall@senegalhotels.sn",
      phone: "+221 77 822 55 14",
      status: "Actif",
      hireDate: "2023-01-12",
      shiftHours: "09:00 - 17:00",
      baseSalary: 480000
    },
    {
      id: "ST-007",
      name: "Mariama Touré",
      roleText: "Adjointe Réceptionniste",
      department: "Réception",
      hotels: ["Nema Kadior"],
      email: "m.toure@senegalhotels.sn",
      phone: "+221 70 811 39 44",
      status: "En Congé",
      hireDate: "2024-03-01",
      shiftHours: "15:00 - 23:00",
      baseSalary: 380000
    },
    {
      id: "ST-008",
      name: "Youssou Ndour Jr",
      roleText: "Agent de Ménage Senior",
      department: "Hébergement & Ménage",
      hotels: ["Les Pélicans du Saloum"],
      email: "y.ndour@senegalhotels.sn",
      phone: "+221 76 501 30 80",
      status: "Actif",
      hireDate: "2023-06-15",
      shiftHours: "08:00 - 16:30",
      baseSalary: 290000
    }
  ]);

  // Form & Interaction states
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRoleText, setNewRoleText] = useState('');
  const [newDepartment, setNewDepartment] = useState<'Réception' | 'Hébergement & Ménage' | 'Restauration & Bar' | 'Technique & Sécurité' | 'Direction & Admin'>('Réception');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newStatus, setNewStatus] = useState<'Actif' | 'De Garde' | 'En Congé' | 'Absent'>('Actif');
  const [newShift, setNewShift] = useState('08:00 - 16:00');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('Tous');
  const [statusFilter, setStatusFilter] = useState<string>('Tous');
  const [hotelFilterValue, setHotelFilterValue] = useState<string>('current'); // 'current' or 'all'

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Add staff member simulator (Owner or Admins)
  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check RBAC Permissions: Housekeeping or receptionist can't hire/register general workforce
    if (currentRole === 'Responsable Ménage' || currentRole === 'Réceptionniste (Front Desk)') {
      triggerToast("Permissions refusées : La création d'une fiche collaborateur exige des privilèges de Direction ou Propriétaire.");
      return;
    }

    if (!newName.trim() || !newRoleText.trim()) {
      triggerToast("Veuillez remplir les informations obligatoires (Nom et Fonction).");
      return;
    }

    const newId = `ST-${Date.now().toString().slice(-3)}`;
    const newMember: StaffMember = {
      id: newId,
      name: newName.trim(),
      roleText: newRoleText.trim(),
      department: newDepartment,
      hotels: [currentHotel as any],
      email: newEmail.trim() || `${newName.toLowerCase().replace(/\s+/g, '.')}@senegalhotels.sn`,
      phone: newPhone.trim() || "+221 77 000 00 00",
      status: newStatus,
      hireDate: new Date().toISOString().split('T')[0],
      shiftHours: newShift,
      baseSalary: newDepartment === 'Direction & Admin' ? 850000 : newDepartment === 'Réception' ? 420000 : newDepartment === 'Restauration & Bar' ? 320000 : 250000
    };

    setStaff([newMember, ...staff]);
    setShowAddStaffModal(false);

    // Reset Form
    setNewName('');
    setNewRoleText('');
    setNewDepartment('Réception');
    setNewEmail('');
    setNewPhone('');
    setNewStatus('Actif');
    setNewShift('08:00 - 16:00');

    onAddNotification(
      "Nouveau collaborateur enregistré",
      `${newName.trim()} a été affecté à l'équipe de ${currentHotel} (${newDepartment}).`,
      'info'
    );

    triggerToast("Fiche collaborateur ajoutée avec succès !");
  };

  // Switch Shift status direct toggle
  const handleToggleStatus = (memberId: string, currentStat: 'Actif' | 'De Garde' | 'En Congé' | 'Absent') => {
    // Household managers can only edit household members status
    const target = staff.find(m => m.id === memberId);
    if (!target) return;

    if (currentRole === 'Responsable Ménage' && target.department !== 'Hébergement & Ménage') {
      triggerToast("Droits restreints : Votre rôle vous permet seulement d'actualiser le statut des équipes Ménage.");
      return;
    }

    const statuses: ('Actif' | 'De Garde' | 'En Congé' | 'Absent')[] = ['Actif', 'De Garde', 'En Congé', 'Absent'];
    const nextIdx = (statuses.indexOf(currentStat) + 1) % statuses.length;
    const nextStatus = statuses[nextIdx];

    setStaff(prev => prev.map(m => {
      if (m.id === memberId) {
        return { ...m, status: nextStatus };
      }
      return m;
    }));

    triggerToast(`Statut de ${target.name} mis à jour : ${nextStatus}`);
  };

  // Remove staff member from current directory (Owner Only)
  const handleRemoveStaff = (id: string, name: string) => {
    if (currentRole !== 'Propriétaire d\'Hôtel') {
      triggerToast("Habilitation insuffisante : Seul le propriétaire sénégalais peut initier une radiation du personnel.");
      return;
    }

    if (!confirm(`Souhaitez-vous retirer définitivement la fiche de ${name} du répertoire actif ?`)) {
      return;
    }

    setStaff(prev => prev.filter(m => m.id !== id));
    triggerToast(`Fiche de ${name} supprimée.`);
  };

  // Computed listings based on active search/hotel filters
  const filteredStaff = useMemo(() => {
    return staff.filter(member => {
      // Hotel matching filter
      const matchesHotel = hotelFilterValue === 'all' || member.hotels.includes(currentHotel as any);
      
      // Department filter
      const matchesDept = deptFilter === 'Tous' || member.department === deptFilter;

      // Status filter
      const matchesStatus = statusFilter === 'Tous' || member.status === statusFilter;

      // Search Query filter (author, position, dept, email etc)
      const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            member.roleText.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            member.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            member.email.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesHotel && matchesDept && matchesStatus && matchesSearch;
    });
  }, [staff, currentHotel, hotelFilterValue, deptFilter, statusFilter, searchQuery]);

  // Overall statistics counters for current hotel group
  const counts = useMemo(() => {
    const hotelStaff = staff.filter(m => m.hotels.includes(currentHotel as any));
    return {
      total: hotelStaff.length,
      active: hotelStaff.filter(m => m.status === 'Actif').length,
      onGuard: hotelStaff.filter(m => m.status === 'De Garde').length,
      onLeave: hotelStaff.filter(m => m.status === 'En Congé').length
    };
  }, [staff, currentHotel]);

  return (
    <div className="space-y-6 fade-in-up">

      {/* Dynamic Toast feedback */}
      {toastMessage && (
        <div className="bg-[#09153D] text-white px-4 py-3.5 rounded-[18px] text-xs font-bold shadow-lg flex items-center gap-2.5 fixed top-6 right-6 z-50 max-w-sm border border-slate-700/60 animate-in fade-in slide-in-from-top-3">
          <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
          <span className="leading-snug text-left text-slate-100">{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left">
          <h2 className="text-2xl font-black text-[#09153D] tracking-tight font-sans">Annuaire du Personnel</h2>
          <p className="text-xs text-slate-400 font-medium font-sans">
            Gestion des équipes de la Téranga, attribution des shifts journaliers et planification pour l'hôtel {currentHotel}
          </p>
        </div>

        {/* Action Trigger button */}
        {(currentRole === 'Propriétaire d\'Hôtel' || currentRole === 'Directeur Financier') && (
          <button
            onClick={() => setShowAddStaffModal(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-orange-600/10 self-start md:self-auto"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>Enregistrer un Collaborateur</span>
          </button>
        )}
      </div>

      {/* STAFF STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total staff members in active hotel */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left flex items-center justify-between">
          <div>
            <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest block">Effectif Téranga</span>
            <span className="text-2xl font-black text-[#09153D] font-mono block mt-1">
              {counts.total} Coéquipiers
            </span>
            <span className="text-[10px] text-slate-450 font-semibold uppercase tracking-tight">Ratachés à cet hôtel</span>
          </div>
          <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Active staff */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left flex items-center justify-between">
          <div>
            <span className="text-[9.5px] font-extrabold text-emerald-650 uppercase tracking-widest block">En Service Actif</span>
            <span className="text-2xl font-black text-emerald-650 font-mono block mt-1">
              {counts.active} Présents
            </span>
            <span className="text-[10px] text-slate-450 font-semibold">Taux d'opération optimal</span>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Staff on guard state */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left flex items-center justify-between">
          <div>
            <span className="text-[9.5px] font-extrabold text-[#09153D]/50 uppercase tracking-widest block">De Garde (Astreinte)</span>
            <span className="text-2xl font-black text-[#09153D] font-mono block mt-1">
              {counts.onGuard} Prêts
            </span>
            <span className="text-[10px] text-slate-450 font-semibold uppercase">Assistance d'urgence</span>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-650 rounded-lg flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Staff on leave status */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left flex items-center justify-between">
          <div>
            <span className="text-[9.5px] font-extrabold text-amber-600 uppercase tracking-widest block">En Congé Annuel</span>
            <span className="text-2xl font-black text-amber-600 font-mono block mt-1">
              {counts.onLeave} Personnes
            </span>
            <span className="text-[10px] text-slate-450 font-medium">Rotation plannings</span>
          </div>
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* FILTERING BAR */}
      <div className="bg-white p-4 rounded-[22px] border border-slate-100 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 select-none">
        
        {/* Left Search input */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Rechercher par nom d'équipier, fonction (ex: Gouvernante, Samba Sow)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50/70 border border-slate-150 py-2.5 pl-10 pr-4 rounded-xl text-xs font-medium focus:none focus:outline-none focus:ring-1 focus:ring-orange-500/50"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Right filters */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Hotel Filter Toggle */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">Périmètre :</span>
            <select
              value={hotelFilterValue}
              onChange={(e) => setHotelFilterValue(e.target.value)}
              className="bg-slate-50 text-[#09153D] border border-slate-150 text-[11px] font-bold py-1.5 px-2.5 rounded-lg focus:outline-none cursor-pointer"
            >
              <option value="current">Hôtel actuel ({currentHotel})</option>
              <option value="all">Tout le groupe Sénégal Hôtels</option>
            </select>
          </div>

          {/* Department Filter Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">Service :</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-50 text-[#09153D] border border-slate-150 text-[11px] font-bold py-1.5 px-2.5 rounded-lg focus:outline-none cursor-pointer"
            >
              <option value="Tous">Tous les Services</option>
              <option value="Direction & Admin">Direction & Admin</option>
              <option value="Réception">Réception & Front Desk</option>
              <option value="Hébergement & Ménage">Hébergement & Ménage</option>
              <option value="Restauration & Bar">Restauration & Bar</option>
              <option value="Technique & Sécurité">Technique & Sécurité</option>
            </select>
          </div>

          {/* Status Filter Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">Statut :</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 text-[#09153D] border border-slate-150 text-[11px] font-bold py-1.5 px-2.5 rounded-lg focus:outline-none cursor-pointer"
            >
              <option value="Tous">Tous Statuts</option>
              <option value="Actif">Actif / Présent</option>
              <option value="De Garde">De Garde</option>
              <option value="En Congé">En Congé</option>
              <option value="Absent">Absent</option>
            </select>
          </div>

        </div>

      </div>

      {/* STAFF LIST GRID CARD */}
      <div className="bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-sm">
        
        <div className="p-5 border-b border-rose-50/20 bg-slate-50/50 flex items-center justify-between text-left">
          <p className="text-xs font-black text-[#09153D] uppercase tracking-wider">
            Registre actif ({filteredStaff.length} fiches sur {staff.length})
          </p>
          <span className="text-[10.5px] text-slate-400 font-medium">Données cryptées protocole Téranga-HR</span>
        </div>

        {filteredStaff.length === 0 ? (
          <div className="p-16 text-center text-slate-400 italic text-xs font-semibold">
            Aucun collaborateur trouvé correspondant à vos critères de recherche.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredStaff.map((member) => (
              <div 
                key={member.id} 
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left hover:bg-slate-50/40 transition-colors"
              >
                
                {/* Left block Info */}
                <div className="flex items-start gap-4 flex-1">
                  
                  {/* Generated Initials Colored Avatar */}
                  <div className="w-11 h-11 rounded-xl bg-[#09153D]/5 border border-slate-200/60 text-xs font-black text-[#09153D] flex items-center justify-center shrink-0 select-none font-mono uppercase">
                    {member.name.split(' ').map(p => p[0]).join('').slice(0, 2)}
                  </div>

                  <div className="space-y-1.5">
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-[#09153D] text-sm leading-none">{member.name}</h4>
                      <span className="bg-[#09153D]/5 border text-[9px] font-bold text-[#09153D] px-2 py-0.5 rounded-md">
                        {member.department}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 font-bold leading-none">
                      {member.roleText} • <span className="text-slate-400 font-medium text-[10px]">Embauché le {member.hireDate}</span>
                    </p>

                    {/* Associated hotels labels */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5 select-none text-[9.5px]">
                      <span className="text-slate-400 font-bold">Affectation hôtelière :</span>
                      {member.hotels.map((h, hIdx) => (
                        <span key={hIdx} className="bg-orange-50 border border-orange-100 text-orange-700 font-black px-1.5 py-0.5 rounded text-[8.5px]">
                          🏢 {h}
                        </span>
                      ))}
                    </div>

                  </div>

                </div>

                {/* Middle Contact Block */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs font-medium md:max-w-md xl:max-w-lg w-full">
                  
                  {/* Phone */}
                  <div className="flex items-center gap-1.5 text-slate-600 flex-1 min-w-0">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-bold font-mono text-[11px]">{member.phone}</span>
                  </div>

                  {/* Mail */}
                  <div className="flex items-center gap-1.5 text-slate-600 flex-1 min-w-0">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-semibold text-slate-500 lowercase text-[11px]">{member.email}</span>
                  </div>

                  {/* Hierarchical sensitive data (Salary) */}
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 shrink-0">
                    {currentRole === 'Propriétaire d\'Hôtel' || currentRole === 'Directeur Financier' ? (
                      <span className="font-mono text-[11px] font-black text-[#09153D] bg-orange-50/70 border border-orange-100 px-2.5 py-1.5 rounded-xl truncate block">
                        💰 {member.baseSalary.toLocaleString('fr-FR')} FCFA/m
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-extrabold flex items-center gap-1 bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-xl select-none" title="Accès restreint aux données financières sous votre hiérarchie">
                        🔒 Confidentiel
                      </span>
                    )}
                  </div>

                </div>

                {/* Right Interactive Controls */}
                <div className="flex items-center justify-between sm:justify-end gap-3.5 border-t border-slate-50 pt-3 md:pt-0 md:border-transparent select-none shrink-0">
                  
                  {/* Shift hour tag */}
                  <div className="text-right hidden xl:block">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block leading-none">Plage Horaire</span>
                    <span className="text-[11px] font-mono font-bold text-[#09153D] block mt-1">{member.shiftHours}</span>
                  </div>

                  {/* Operational Shift Status toggler */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleStatus(member.id, member.status)}
                      className={`inline-flex items-center gap-1 text-[10.5px] font-extrabold px-3 py-1.5 rounded-xl cursor-pointer border transition-colors ${
                        member.status === 'Actif' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/50' :
                        member.status === 'De Garde' ? 'bg-blue-50 text-[#09153D] border-blue-100 hover:bg-blue-100/50' :
                        member.status === 'En Congé' ? 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100/50' :
                        'bg-red-50 text-red-650 border-red-100 hover:bg-red-100/50'
                      }`}
                      title="Cliquez pour permuter le statut professionnel"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        member.status === 'Actif' ? 'bg-emerald-500' :
                        member.status === 'De Garde' ? 'bg-blue-600' :
                        member.status === 'En Congé' ? 'bg-amber-500' :
                        'bg-red-500'
                      }`} />
                      <span>{member.status}</span>
                    </button>
                  </div>

                  {/* Owner level delete */}
                  {currentRole === 'Propriétaire d\'Hôtel' && (
                    <button
                      onClick={() => handleRemoveStaff(member.id, member.name)}
                      className="text-red-500 hover:text-red-700 p-2 rounded-xl hover:bg-red-50 cursor-pointer"
                      title="Supprimer la fiche"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                </div>

              </div>
            ))}
          </div>
        )}

      </div>

      {/* REGISTER NEW COLLABORATOR MODAL (Direct simulation) */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-[#09153D]/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] border border-slate-150/80 shadow-2xl max-w-md w-full overflow-hidden text-left animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-orange-600 to-amber-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="w-5.5 h-5.5 text-white" />
                <div>
                  <h3 className="font-extrabold text-white text-md tracking-tight">Nouvelle Fiche Sénégal Hôtels</h3>
                  <p className="text-[10px] text-orange-100 font-medium">Affectation directe à l'hôtel {currentHotel}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddStaffModal(false)}
                className="text-white hover:text-orange-200 cursor-pointer text-sm font-bold bg-white/10 w-7 h-7 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddStaffSubmit} className="p-6 space-y-4">
              
              {/* Full Name & Specific role */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Nom Complet du Collaborateur * :
                </label>
                <input
                  type="text"
                  placeholder="Ex : Moussa Sarr"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Fonction / Poste Principal * :
                </label>
                <input
                  type="text"
                  placeholder="Ex : Lieutenant de Sécurité, Cuisinier Adjoint..."
                  value={newRoleText}
                  onChange={(e) => setNewRoleText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none"
                  required
                />
              </div>

              {/* Department & Shift Time range */}
              <div className="grid grid-cols-2 gap-4">
                
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Département :
                  </label>
                  <select
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none cursor-pointer"
                  >
                    <option value="Réception">Réception</option>
                    <option value="Hébergement & Ménage">Hébergement & Ménage</option>
                    <option value="Restauration & Bar">Restauration & Bar</option>
                    <option value="Technique & Sécurité">Technique & Sécurité</option>
                    <option value="Direction & Admin">Direction & Admin</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Heures de Service (Shift) :
                  </label>
                  <input
                    type="text"
                    placeholder="Ex : 08:00 - 16:30"
                    value={newShift}
                    onChange={(e) => setNewShift(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none"
                  />
                </div>

              </div>

              {/* Email & Phone numbers */}
              <div className="grid grid-cols-2 gap-4">
                
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Réseau Mobile (Sénégal) :
                  </label>
                  <input
                    type="text"
                    placeholder="+221 77 123 45 67"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Email Pro (Optionnel) :
                  </label>
                  <input
                    type="email"
                    placeholder="m.sarr@senegalhotels.sn"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none"
                  />
                </div>

              </div>

              {/* Initial Status Selector */}
              <div className="space-y-2">
                <label className="block text-[10.5px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Statut initial de prise de poste :
                </label>
                <div className="flex gap-2">
                  {(['Actif', 'De Garde', 'En Congé'] as const).map((stat) => (
                    <button
                      key={stat}
                      type="button"
                      onClick={() => setNewStatus(stat)}
                      className={`flex-1 py-2.5 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                        newStatus === stat 
                          ? 'bg-[#09153D] border-[#09153D] text-white' 
                          : 'bg-slate-50 border-slate-200 text-[#09153D] hover:bg-slate-100'
                      }`}
                    >
                      {stat === 'Actif' ? '✓ Actif' : stat === 'De Garde' ? '⚡ De Garde' : '📅 En Congé'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Actions footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 select-none">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4.5 py-3 hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl cursor-pointer shadow-md shadow-orange-550/10"
                >
                  Créer la Fiche & Notifier
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
