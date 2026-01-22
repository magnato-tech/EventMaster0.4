import React, { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { AppState, Person, Group, GroupMember } from '../types';
import { supabase, supabaseConfig } from '../lib/supabaseClient';

interface SettingsTabProps {
  db: AppState;
  setDb: React.Dispatch<React.SetStateAction<AppState>>;
}

const formatRole = (role: Person['core_role']): string => {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'pastor':
      return 'Pastor';
    case 'team_leader':
      return 'Teamleder';
    case 'member':
      return 'Medlem';
    case 'guest':
      return 'Gjest';
    default:
      return 'Ukjent';
  }
};

const escapeCsv = (value: string): string => {
  const safe = value.replace(/"/g, '""');
  return `"${safe}"`;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildCsv = (persons: Person[]): string => {
  const headers = [
    'Navn',
    'E-post',
    'Telefon',
    'Adresse',
    'Postnr',
    'By',
    'Rolle',
    'Aktiv'
  ];

  const rows = persons.map(person => {
    const address = person.streetAddress || '';
    return [
      person.name || '',
      person.email || '',
      person.phone || '',
      address,
      person.postalCode || '',
      person.city || '',
      formatRole(person.core_role),
      person.is_active ? 'Ja' : 'Nei'
    ].map(escapeCsv).join(',');
  });

  return ['\ufeff' + headers.map(escapeCsv).join(','), ...rows].join('\n');
};

const SettingsTab: React.FC<SettingsTabProps> = ({ db, setDb }) => {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const canSync = useMemo(() => Boolean(supabase), []);

  const handleSyncFromSupabase = async () => {
    if (!supabase) {
      alert('Supabase er ikke konfigurert. Sett VITE_SUPABASE_URL og VITE_SUPABASE_ANON_KEY.');
      return;
    }

    const ok = confirm('Dette vil erstatte lokale medlemmer og grupper med data fra Supabase. Fortsette?');
    if (!ok) return;

    setSyncStatus('loading');

    try {
      const [{ data: persons, error: personsError }, { data: groups, error: groupsError }, { data: members, error: membersError }] = await Promise.all([
        supabase.from(supabaseConfig.tables.persons).select('*'),
        supabase.from(supabaseConfig.tables.groups).select('*'),
        supabase.from(supabaseConfig.tables.groupMembers).select('*')
      ]);

      if (personsError) throw personsError;
      if (groupsError) throw groupsError;
      if (membersError) throw membersError;

      const mappedPersons: Person[] = (persons || []).map((row: any) => ({
        id: row.id || row.uuid || row.person_id,
        name: row.name || row.full_name || row.fullName || '',
        email: row.email || row.mail || undefined,
        phone: row.phone || row.mobile || row.mobile_phone || undefined,
        imageUrl: row.image_url || row.imageUrl || undefined,
        social_security_number: row.social_security_number || row.ssn || undefined,
        birth_year: row.birth_year || row.birthYear || undefined,
        birth_date: row.birth_date || row.birthDate || row.birthdate || row.dob || undefined,
        streetAddress: row.street_address || row.streetAddress || undefined,
        postalCode: row.postal_code || row.postalCode || undefined,
        city: row.city || undefined,
        is_admin: row.is_admin ?? row.isAdmin ?? false,
        is_active: row.is_active ?? row.isActive ?? true,
        core_role: row.core_role || row.coreRole || 'member'
      })).filter(person => person.id && person.name);

      const mappedGroups: Group[] = (groups || []).map((row: any) => ({
        id: row.id || row.uuid || row.group_id,
        name: row.name || '',
        category: row.category || row.group_category || 'fellowship',
        description: row.description || undefined,
        link: row.link || undefined,
        parent_id: row.parent_id || row.parentId || undefined,
        gathering_pattern: row.gathering_pattern || row.gatheringPattern || undefined,
        leaderId: row.leader_id || row.leaderId || undefined,
        deputyId: row.deputy_id || row.deputyId || undefined
      })).filter(group => group.id && group.name);

      const mappedGroupMembers: GroupMember[] = (members || []).map((row: any) => ({
        id: row.id || row.uuid || row.group_member_id,
        group_id: row.group_id || row.groupId,
        person_id: row.person_id || row.personId,
        role: row.role || row.group_role || 'member',
        service_role_id: row.service_role_id || row.serviceRoleId || undefined
      })).filter(member => member.id && member.group_id && member.person_id);

      setDb(prev => ({
        ...prev,
        persons: mappedPersons,
        groups: mappedGroups,
        groupMembers: mappedGroupMembers
      }));

      setSyncStatus('done');
    } catch (error) {
      console.error('Supabase sync failed', error);
      setSyncStatus('error');
      alert('Synkronisering feilet. Sjekk konsollen for detaljer.');
    }
  };

  const handleExportCsv = () => {
    const sorted = [...db.persons].sort((a, b) => a.name.localeCompare(b.name, 'no'));
    const csv = buildCsv(sorted);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `menighet_medlemmer_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    const sorted = [...db.persons].sort((a, b) => a.name.localeCompare(b.name, 'no'));
    const rows = sorted.map(person => `
      <tr>
        <td>${escapeHtml(person.name || '')}</td>
        <td>${escapeHtml(person.email || '')}</td>
        <td>${escapeHtml(person.phone || '')}</td>
        <td>${escapeHtml(person.streetAddress || '')}</td>
        <td>${escapeHtml(person.postalCode || '')}</td>
        <td>${escapeHtml(person.city || '')}</td>
        <td>${escapeHtml(formatRole(person.core_role))}</td>
        <td>${person.is_active ? 'Ja' : 'Nei'}</td>
      </tr>
    `).join('');

    const html = `
      <html>
        <head>
          <title>Menighetsrapport</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
            h1 { font-size: 20px; margin: 0 0 12px; }
            .meta { font-size: 12px; color: #64748b; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Medlemsrapport</h1>
          <div class="meta">Generert ${new Date().toLocaleDateString('no-NO')}</div>
          <table>
            <thead>
              <tr>
                <th>Navn</th>
                <th>E-post</th>
                <th>Telefon</th>
                <th>Adresse</th>
                <th>Postnr</th>
                <th>By</th>
                <th>Rolle</th>
                <th>Aktiv</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Kunne ikke åpne utskriftsvindu. Sjekk popup-blokkering.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Innstillinger</h2>
        <p className="text-sm text-slate-600">Administrer rapporter og eksport.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
          <Download size={18} className="text-indigo-600" />
          <h3 className="text-base font-semibold text-slate-900">Rapporter</h3>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Ta ut rapport for alle medlemmer i menigheten som CSV eller PDF.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
            >
              <FileSpreadsheet size={16} />
              Eksporter CSV
            </button>
            <button
              onClick={handleExportPdf}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
            >
              <FileText size={16} />
              Eksporter PDF
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mt-6">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
          <Download size={18} className="text-indigo-600" />
          <h3 className="text-base font-semibold text-slate-900">Synkronisering</h3>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Hent medlemmer og grupper fra produksjon (Supabase) og oppdater lokal database.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <button
              onClick={handleSyncFromSupabase}
              disabled={!canSync || syncStatus === 'loading'}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md font-semibold transition-colors ${!canSync || syncStatus === 'loading' ? 'bg-slate-200 text-slate-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
            >
              {syncStatus === 'loading' ? 'Synkroniserer...' : 'Synk fra Supabase'}
            </button>
            {syncStatus === 'done' && (
              <span className="text-sm text-emerald-600">Synkronisering fullført.</span>
            )}
            {syncStatus === 'error' && (
              <span className="text-sm text-rose-600">Synk feilet. Sjekk konfig.</span>
            )}
            {!canSync && (
              <span className="text-xs text-slate-500">
                Sett `VITE_SUPABASE_URL` og `VITE_SUPABASE_ANON_KEY` i `.env.local`.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;

