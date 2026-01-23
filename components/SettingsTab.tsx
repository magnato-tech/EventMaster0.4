import React, { useRef, useState } from 'react';
import { AppState, Group, GroupMember, Person } from '../types';
import { CloudDownload, Database, Download, FileUp, RotateCcw, UploadCloud } from 'lucide-react';
import { EMPTY_DATA } from '../constants';
import { supabase, supabaseTables } from '../lib/supabaseClient';

type SyncMode = 'supabase' | 'local';

interface SettingsTabProps {
  onLoadBackup: (state: AppState) => void;
  syncMode: SyncMode;
  onSyncModeChange: (mode: SyncMode) => void;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

const DB_KEY = 'eventmaster_lmk_db';
const IMAGE_LIBRARY_KEY = 'eventmaster_image_library';

const normalizeBackup = (payload: Partial<AppState>): AppState => ({
  persons: Array.isArray(payload.persons) ? payload.persons : [],
  groups: Array.isArray(payload.groups) ? payload.groups : [],
  groupMembers: Array.isArray(payload.groupMembers) ? payload.groupMembers : [],
  serviceRoles: Array.isArray(payload.serviceRoles) ? payload.serviceRoles : [],
  groupServiceRoles: Array.isArray(payload.groupServiceRoles) ? payload.groupServiceRoles : [],
  eventTemplates: Array.isArray(payload.eventTemplates) ? payload.eventTemplates : [],
  eventOccurrences: Array.isArray(payload.eventOccurrences) ? payload.eventOccurrences : [],
  assignments: Array.isArray(payload.assignments) ? payload.assignments : [],
  programItems: Array.isArray(payload.programItems) ? payload.programItems : [],
  tasks: Array.isArray(payload.tasks) ? payload.tasks : [],
  noticeMessages: Array.isArray(payload.noticeMessages) ? payload.noticeMessages : [],
  changeLogs: Array.isArray(payload.changeLogs) ? payload.changeLogs : [],
  families: Array.isArray(payload.families) ? payload.families : [],
  familyMembers: Array.isArray(payload.familyMembers) ? payload.familyMembers : []
});

const SettingsTab: React.FC<SettingsTabProps> = ({ onLoadBackup, syncMode, onSyncModeChange }) => {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string>('');
  const [report, setReport] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleLoadBackup = async () => {
    if (!confirm('Dette vil overskrive lokal data. Fortsette?')) return;
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/master_data_backup.json', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Fant ikke master_data_backup.json');
      }
      const payload = await response.json();
      const nextState = normalizeBackup(payload);

      if (nextState.persons.length === 0 && nextState.groups.length === 0) {
        throw new Error('Backup ser tom ut. Kjør "npm run seed:local" først.');
      }

      onLoadBackup(nextState);
      setStatus('success');
      setMessage(`Lastet backup: ${nextState.persons.length} personer, ${nextState.groups.length} grupper.`);
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Kunne ikke laste backup.');
    }
  };

  const readLocalState = (): AppState => {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return EMPTY_DATA;
      return normalizeBackup(JSON.parse(raw));
    } catch (error) {
      console.error(error);
      return EMPTY_DATA;
    }
  };

  const summarizeData = (state: AppState) => {
    const personIds = new Set(state.persons.map(p => p.id));
    const groupIds = new Set(state.groups.map(g => g.id));
    const roleIds = new Set(state.serviceRoles.map(r => r.id));
    const occurrenceIds = new Set(state.eventOccurrences.map(o => o.id));
    const templateIds = new Set(state.eventTemplates.map(t => t.id));
    const familyIds = new Set(state.families.map(f => f.id));

    const invalidGroupMembers = state.groupMembers.filter(gm => !personIds.has(gm.person_id) || !groupIds.has(gm.group_id));
    const invalidAssignments = state.assignments.filter(a =>
      (a.person_id && !personIds.has(a.person_id)) ||
      (a.occurrence_id && !occurrenceIds.has(a.occurrence_id)) ||
      (a.template_id && !templateIds.has(a.template_id)) ||
      !roleIds.has(a.service_role_id)
    );
    const invalidProgramItems = state.programItems.filter(p =>
      (p.person_id && !personIds.has(p.person_id)) ||
      (p.group_id && !groupIds.has(p.group_id)) ||
      (p.occurrence_id && !occurrenceIds.has(p.occurrence_id)) ||
      (p.template_id && !templateIds.has(p.template_id)) ||
      (p.service_role_id && !roleIds.has(p.service_role_id))
    );
    const invalidFamilyMembers = state.familyMembers.filter(fm => !familyIds.has(fm.family_id) || !personIds.has(fm.person_id));
    const invalidTasks = state.tasks.filter(t =>
      !personIds.has(t.responsible_id) ||
      (t.occurrence_id && !occurrenceIds.has(t.occurrence_id)) ||
      (t.template_id && !templateIds.has(t.template_id))
    );

    return [
      `Personer: ${state.persons.length}`,
      `Grupper: ${state.groups.length}`,
      `Familier: ${state.families.length}`,
      `Arrangementer: ${state.eventOccurrences.length}`,
      `Oppgaver: ${state.tasks.length}`,
      `Ugyldige gruppemedlemskap: ${invalidGroupMembers.length}`,
      `Ugyldige bemanninger: ${invalidAssignments.length}`,
      `Ugyldige programposter: ${invalidProgramItems.length}`,
      `Ugyldige familiemedlemmer: ${invalidFamilyMembers.length}`,
      `Ugyldige tasks: ${invalidTasks.length}`
    ].join('\n');
  };

  const handleRunDataCheck = () => {
    const state = readLocalState();
    const summary = summarizeData(state);
    setReport(summary);
    setStatus('success');
    setMessage('Datasjekk fullfort.');
  };

  const handleClearImageCache = () => {
    if (!confirm('Dette sletter lokal bilde-cache. Fortsette?')) return;
    localStorage.removeItem(IMAGE_LIBRARY_KEY);
    setStatus('success');
    setMessage('Bilde-cache er slettet.');
  };

  const handleDownloadBackup = () => {
    const state = readLocalState();
    downloadPayload({
      ...state,
      exportDate: new Date().toISOString(),
      version: '0.4'
    });
    setStatus('success');
    setMessage('Full backup lastet ned fra localStorage.');
  };

  const handleDownloadPersonsGroups = () => {
    const state = readLocalState();
    downloadPayload({
      persons: state.persons,
      groups: state.groups,
      exportDate: new Date().toISOString(),
      version: '0.4'
    });
    setStatus('success');
    setMessage('Eksporterte kun personer og grupper.');
  };

  const downloadPayload = (payload: unknown) => {
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'master_data_backup.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    if (!confirm('Dette vil overskrive lokal data. Fortsette?')) return;

    setStatus('loading');
    setMessage('');

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const nextState = normalizeBackup(payload);

      if (nextState.persons.length === 0 && nextState.groups.length === 0) {
        throw new Error('Backup ser tom ut.');
      }

      onLoadBackup(nextState);
      setStatus('success');
      setMessage(`Importert: ${nextState.persons.length} personer, ${nextState.groups.length} grupper.`);
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Kunne ikke importere filen.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetData = () => {
    if (!confirm('Dette nullstiller all lokal data. Fortsette?')) return;
    onLoadBackup(EMPTY_DATA);
    setStatus('success');
    setMessage('Lokal data er nullstilt.');
  };

  const mapPerson = (row: any): Person => ({
    id: row.id,
    name: row.name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    imageUrl: row.image_url ?? undefined,
    social_security_number: row.social_security_number ?? undefined,
    birth_year: row.birth_year ?? undefined,
    birth_date: row.birth_date ?? undefined,
    streetAddress: row.street_address ?? undefined,
    postalCode: row.postal_code ?? undefined,
    city: row.city ?? undefined,
    is_admin: Boolean(row.is_admin),
    is_active: row.is_active !== false,
    core_role: row.core_role || 'member'
  });

  const mapGroup = (row: any): Group => ({
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description ?? undefined,
    link: row.link ?? undefined,
    parent_id: row.parent_id ?? undefined,
    gathering_pattern: row.gathering_pattern ?? undefined,
    leaderId: row.leader_id ?? undefined,
    deputyId: row.deputy_id ?? undefined
  });

  const mapGroupMember = (row: any): GroupMember => ({
    id: row.id,
    group_id: row.group_id,
    person_id: row.person_id,
    role: row.role,
    service_role_id: row.service_role_id ?? undefined
  });

  const handleFetchFromSupabase = async () => {
    if (!supabase) {
      setStatus('error');
      setMessage('Supabase er ikke konfigurert.');
      return;
    }
    if (!confirm('Dette vil overskrive lokal data med Supabase-innhold. Fortsette?')) return;

    setStatus('loading');
    setMessage('');

    try {
      const [personsResult, groupsResult, membersResult] = await Promise.all([
        supabase.from(supabaseTables.persons).select('*'),
        supabase.from(supabaseTables.groups).select('*'),
        supabase.from(supabaseTables.groupMembers).select('*')
      ]);

      if (personsResult.error || groupsResult.error || membersResult.error) {
        throw new Error('Kunne ikke hente data fra Supabase.');
      }

      const persons = (personsResult.data || []).map(mapPerson);
      const groups = (groupsResult.data || []).map(mapGroup);
      const groupMembers = (membersResult.data || []).map(mapGroupMember);

      const nextState: AppState = {
        ...EMPTY_DATA,
        persons,
        groups,
        groupMembers
      };

      onLoadBackup(nextState);
      setStatus('success');
      setMessage(`Hentet fra Supabase: ${persons.length} personer, ${groups.length} grupper.`);
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Kunne ikke hente fra Supabase.');
    }
  };

  return (
    <div className="space-y-6 max-w-[900px] mx-auto pb-20 md:pb-8 animate-in fade-in duration-300 text-left">
      <header className="border-b border-slate-200 pb-3 flex items-center gap-3">
        <Database size={20} className="text-indigo-600" />
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Innstillinger</h2>
          <p className="text-xs text-slate-500 font-medium">Lokal backup og utviklingsverktøy.</p>
        </div>
      </header>

      <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Synkronisering</h3>
          <p className="text-xs text-slate-500">
            Velg om endringer skal synkes til Supabase eller holdes lokalt i nettleseren.
          </p>
        </div>

        <div className="inline-flex rounded-md border border-slate-300 overflow-hidden">
          <button
            onClick={() => onSyncModeChange('supabase')}
            className={`px-4 py-2 text-xs font-semibold transition-colors ${
              syncMode === 'supabase' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Synk til Supabase
          </button>
          <button
            onClick={() => onSyncModeChange('local')}
            className={`px-4 py-2 text-xs font-semibold transition-colors ${
              syncMode === 'local' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Lokal sandkasse
          </button>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Hent fra Supabase</h3>
          <p className="text-xs text-slate-500">
            Importerer personer, grupper og gruppemedlemskap fra Supabase til lokal data.
          </p>
        </div>

        <button
          onClick={handleFetchFromSupabase}
          disabled={status === 'loading'}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-md font-medium hover:bg-slate-50 transition-colors disabled:opacity-60"
        >
          <CloudDownload size={16} />
          Hent fra Supabase na
        </button>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Last inn backup</h3>
          <p className="text-xs text-slate-500">
            Laster data fra <code>master_data_backup.json</code> og overskriver lokal data (localStorage).
            Dette bruker ikke Supabase.
          </p>
        </div>

        <button
          onClick={handleLoadBackup}
          disabled={status === 'loading'}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          <UploadCloud size={16} />
          {status === 'loading' ? 'Laster...' : 'Last inn backup'}
        </button>

        {message && (
          <p className={`text-xs ${status === 'error' ? 'text-rose-600' : 'text-emerald-700'}`}>
            {message}
          </p>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Datasjekk</h3>
          <p className="text-xs text-slate-500">
            Sjekker konsistens i lokale data og viser en kort rapport.
          </p>
        </div>

        <button
          onClick={handleRunDataCheck}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-md font-medium hover:bg-slate-50 transition-colors"
        >
          Kjor datasjekk
        </button>

        {report && (
          <pre className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-3 whitespace-pre-wrap">
            {report}
          </pre>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Bilde-cache</h3>
          <p className="text-xs text-slate-500">
            Tøm lokal cache for personbilder (lagret i localStorage).
          </p>
        </div>

        <button
          onClick={handleClearImageCache}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-md font-medium hover:bg-slate-50 transition-colors"
        >
          Tøm bilde-cache
        </button>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Importer fra fil</h3>
          <p className="text-xs text-slate-500">
            Importer en JSON-backup fra disk og overskriv lokal data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={(e) => handleImportFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-md font-medium hover:bg-slate-50 transition-colors"
          >
            <FileUp size={16} />
            Velg fil
          </button>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Last ned backup</h3>
          <p className="text-xs text-slate-500">
            Lager en lokal JSON-backup av hele datasettet i localStorage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownloadBackup}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-md font-medium hover:bg-slate-50 transition-colors"
          >
            <Download size={16} />
            Full eksport
          </button>
          <button
            onClick={handleDownloadPersonsGroups}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-md font-medium hover:bg-slate-50 transition-colors"
          >
            <Download size={16} />
            Kun personer/grupper
          </button>
        </div>
      </section>

      <section className="bg-white border border-rose-200 rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-rose-700">Nullstill lokal data</h3>
          <p className="text-xs text-rose-600">
            Sletter alle lokale data og starter med tomt datasett.
          </p>
        </div>

        <button
          onClick={handleResetData}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-rose-600 text-white rounded-md font-medium hover:bg-rose-700 transition-colors"
        >
          <RotateCcw size={16} />
          Nullstill data
        </button>
      </section>
    </div>
  );
};

export default SettingsTab;
