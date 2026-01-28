import React, { useRef, useState, useEffect } from 'react';
import { AppState, Family, FamilyMember, FamilyRole, Group, GroupCategory, GroupMember, GroupRole, GroupServiceRole, Person, ServiceRole, Room } from '../types';
import { CloudDownload, Database, Download, FileDown, DownloadCloud, RotateCcw, Palette, Sliders, Check, Home, Trash2 } from 'lucide-react';
import { EMPTY_DATA } from '../constants';
import { DEMO_MAX_PEOPLE, generatePersons, POPULATED_DATA } from '../scripts/seedData';
import { supabase, supabaseTables } from '../lib/supabaseClient';

type SyncMode = 'supabase' | 'local';

interface SettingsTabProps {
  db: AppState;
  setDb: React.Dispatch<React.SetStateAction<AppState>>;
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
  rooms: Array.isArray(payload.rooms) ? payload.rooms : [],
  roomConflictCheckEnabled: typeof payload.roomConflictCheckEnabled === 'boolean' ? payload.roomConflictCheckEnabled : false,
  eventTemplates: Array.isArray(payload.eventTemplates) ? payload.eventTemplates : [],
  eventOccurrences: Array.isArray(payload.eventOccurrences) ? payload.eventOccurrences : [],
  assignments: Array.isArray(payload.assignments) ? payload.assignments : [],
  programItems: Array.isArray(payload.programItems) ? payload.programItems : [],
  tasks: Array.isArray(payload.tasks) ? payload.tasks : [],
  noticeMessages: Array.isArray(payload.noticeMessages) ? payload.noticeMessages : [],
  attendanceResponses: Array.isArray(payload.attendanceResponses) ? payload.attendanceResponses : [],
  changeLogs: Array.isArray(payload.changeLogs) ? payload.changeLogs : [],
  families: Array.isArray(payload.families) ? payload.families : [],
  familyMembers: Array.isArray(payload.familyMembers) ? payload.familyMembers : []
});

const SettingsTab: React.FC<SettingsTabProps> = ({ db, setDb, onLoadBackup, syncMode, onSyncModeChange }) => {
  const [activeSubTab, setActiveSubTab] = useState<'data' | 'appearance' | 'rooms'>('data');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string>('');
  const [report, setReport] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [customPeopleCount, setCustomPeopleCount] = useState<number>(
    Math.min(POPULATED_DATA.persons.length, DEMO_MAX_PEOPLE)
  );
  const [customFamilyCount, setCustomFamilyCount] = useState<number>(Math.min(POPULATED_DATA.families.length || 12, 12));
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);
  const [isGroupsModalOpen, setIsGroupsModalOpen] = useState<boolean>(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState<number>(40);

  // Tema-styring
  const [theme, setTheme] = useState({
    primary: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#6366f1',
    radius: getComputedStyle(document.documentElement).getPropertyValue('--radius-md').trim() || '8px',
    sidebarMode: localStorage.getItem('theme_sidebar_mode') || 'light',
    darkMode: localStorage.getItem('theme_dark_mode') === 'true',
  });

  const updateThemeVariable = (name: string, value: string) => {
    document.documentElement.style.setProperty(name, value);
    if (name === '--color-primary') {
      document.documentElement.style.setProperty('--color-primary-hover', value);
      document.documentElement.style.setProperty('--color-primary-light', `${value}20`);
    }
    const key = name.startsWith('--radius') ? 'radius' : (name.startsWith('--color-primary') ? 'primary' : name);
    setTheme(prev => ({ ...prev, [key]: value }));
    localStorage.setItem(`theme_${name}`, value);
  };

  const setSidebarMode = (mode: string) => {
    setTheme(prev => ({ ...prev, sidebarMode: mode }));
    localStorage.setItem('theme_sidebar_mode', mode);
    if (mode === 'dark') {
      document.documentElement.classList.add('sidebar-dark');
    } else {
      document.documentElement.classList.remove('sidebar-dark');
    }
  };

  const setDarkMode = (enabled: boolean) => {
    setTheme(prev => ({ ...prev, darkMode: enabled }));
    localStorage.setItem('theme_dark_mode', String(enabled));
    if (enabled) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  };

  const applyPreset = (preset: { primary: string, radius: string, sidebar: string, darkMode?: boolean }) => {
    updateThemeVariable('--color-primary', preset.primary);
    updateThemeVariable('--radius-md', preset.radius);
    setSidebarMode(preset.sidebar);
    if (preset.darkMode !== undefined) setDarkMode(preset.darkMode);
  };

  useEffect(() => {
    const primary = localStorage.getItem('theme_--color-primary');
    const radius = localStorage.getItem('theme_--radius-md');
    const sidebar = localStorage.getItem('theme_sidebar_mode');
    const dark = localStorage.getItem('theme_dark_mode') === 'true';
    if (primary) updateThemeVariable('--color-primary', primary);
    if (radius) updateThemeVariable('--radius-md', radius);
    if (sidebar) setSidebarMode(sidebar);
    if (dark) setDarkMode(true);
  }, []);

  const handleLoadBackup = async () => {
    if (!confirm('Dette vil overskrive lokal data. Fortsette?')) return;
    setStatus('loading');
    setMessage('');

    try {
      const nextState: AppState = {
        ...POPULATED_DATA,
        eventTemplates: [...POPULATED_DATA.eventTemplates]
      };

      if (nextState.persons.length === 0 && nextState.groups.length === 0) {
        throw new Error('Demo-data er tom.');
      }

      onLoadBackup(nextState);
      setStatus('success');
      setMessage(`Lastet demo-data: ${nextState.persons.length} personer, ${nextState.groups.length} grupper.`);
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Kunne ikke laste demo-data.');
    }
  };

  const handleSyncModeChange = (mode: SyncMode) => {
    if (mode === syncMode) return;
    const message =
      mode === 'supabase'
        ? 'Synk til Supabase betyr at nye endringer fra nå blir sendt til Supabase. Eksisterende data blir ikke hentet inn. Fortsette?'
        : 'Lokal sandkasse betyr at endringer kun lagres i nettleseren og ikke sendes til Supabase. Fortsette?';
    if (!confirm(message)) return;
    onSyncModeChange(mode);
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

  const hasLocalPersons = () => readLocalState().persons.length > 0;

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
      `Rom: ${state.rooms.length}`,
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

  const handleAddRoom = () => {
    const name = newRoomName.trim();
    if (!name) return;
    const capacity = Number.isFinite(newRoomCapacity) ? Math.max(0, newRoomCapacity) : undefined;
    setDb(prev => ({
      ...prev,
      rooms: [
        ...prev.rooms,
        {
          id: crypto.randomUUID(),
          name,
          capacity
        }
      ]
    }));
    setNewRoomName('');
    setNewRoomCapacity(40);
  };

  const handleUpdateRoom = (roomId: string, updates: Partial<Room>) => {
    setDb(prev => ({
      ...prev,
      rooms: prev.rooms.map(room => room.id === roomId ? { ...room, ...updates } : room)
    }));
  };

  const handleDeleteRoom = (roomId: string) => {
    if (!confirm('Slette dette rommet?')) return;
    setDb(prev => ({
      ...prev,
      rooms: prev.rooms.filter(room => room.id !== roomId)
    }));
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
    onLoadBackup({
      ...EMPTY_DATA,
      eventOccurrences: [],
      assignments: [],
      programItems: [],
      changeLogs: []
    });
    setStatus('success');
    setMessage('Lokal data og kalender er nullstilt.');
  };

  const handleClearPeople = () => {
    if (!confirm('Dette fjerner alle personer og relasjoner. Fortsette?')) return;
    if (!confirm('Siste advarsel: Dette kan ikke angres. Vil du slette persondata nå?')) return;
    const current = readLocalState();
    const retainedAdmins = current.persons.filter(person => person.is_admin);
    const nextState: AppState = {
      ...current,
      persons: retainedAdmins,
      groupMembers: [],
      families: [],
      familyMembers: [],
      noticeMessages: [],
      assignments: current.assignments.map(a => ({ ...a, person_id: null })),
      programItems: current.programItems.map(p => ({ ...p, person_id: null }))
    };
    onLoadBackup(nextState);
    setStatus('success');
    setMessage(retainedAdmins.length > 0 ? 'Alle personer unntatt admin er fjernet.' : 'Alle personer og relasjoner er fjernet.');
  };

  const handleClearGroups = () => {
    if (!confirm('Dette sletter alle grupper og gruppetilknytninger. Fortsette?')) return;
    const current = readLocalState();
    const nextState: AppState = {
      ...current,
      groups: [],
      groupMembers: [],
      groupServiceRoles: [],
      programItems: current.programItems.map(p => ({ ...p, group_id: null }))
    };
    onLoadBackup(nextState);
    setStatus('success');
    setMessage('Alle grupper og gruppetilknytninger er fjernet.');
  };

  const buildSuggestedGroups = (sourcePersons: Person[], sourceRoles: ServiceRole[]) => {
    const groupServiceRoles: GroupServiceRole[] = [];
    const groups: Group[] = [];
    const groupMembers: GroupMember[] = [];
    const leaderIds: string[] = [];
    let personIndex = 0;

    const pickMembers = (count: number): Person[] => {
      if (sourcePersons.length === 0) return [];
      return Array.from({ length: count }, () => sourcePersons[personIndex++ % sourcePersons.length]);
    };

    const addGroup = (id: string, name: string, category: GroupCategory, parentId?: string | null) => {
      const members = pickMembers(6);
      const leaderId = members[0]?.id;
      const deputyId = members[1]?.id;
      if (leaderId) leaderIds.push(leaderId);
      if (deputyId) leaderIds.push(deputyId);

      groups.push({
        id,
        name,
        category,
        parent_id: parentId ?? null,
        leaderId,
        deputyId
      });

      members.forEach((person, idx) => {
        const role = idx === 0 ? GroupRole.LEADER : idx === 1 ? GroupRole.DEPUTY_LEADER : GroupRole.MEMBER;
        groupMembers.push({
          id: crypto.randomUUID(),
          group_id: id,
          person_id: person.id,
          role
        });
      });
    };

    const barnekirkeId = 'grp-barnekirke';
    addGroup('team-lovsang', 'Lovsang', GroupCategory.SERVICE);
    addGroup('team-teknikk', 'Teknikk', GroupCategory.SERVICE);
    addGroup(barnekirkeId, 'Barnekirke', GroupCategory.SERVICE);
    addGroup('team-vertskap', 'Vertskap', GroupCategory.SERVICE);
    addGroup('team-forbonn', 'Forbønn', GroupCategory.SERVICE);
    addGroup('team-rigg', 'Rigg', GroupCategory.SERVICE);
    addGroup('team-markedsforing', 'Markedsføring', GroupCategory.SERVICE);

    addGroup('hus-menn-1', 'Husgruppe Menn 1', GroupCategory.FELLOWSHIP);
    addGroup('hus-menn-2', 'Husgruppe Menn 2', GroupCategory.FELLOWSHIP);
    addGroup('hus-damer-1', 'Husgruppe Damer 1', GroupCategory.FELLOWSHIP);
    addGroup('hus-damer-2', 'Husgruppe Damer 2', GroupCategory.FELLOWSHIP);

    addGroup('bk-gronn', 'Grønn gruppe (under skolealder)', GroupCategory.BARNKIRKE, barnekirkeId);
    addGroup('bk-gul', 'Gul gruppe (1-4 klasse)', GroupCategory.BARNKIRKE, barnekirkeId);
    addGroup('bk-tweens', 'Tweens (5-7 klasse)', GroupCategory.BARNKIRKE, barnekirkeId);

    addGroup('ungdom', 'Ungdom (8-12 klasse)', GroupCategory.FELLOWSHIP);
    addGroup('konfirmant', 'Konfirmant (8. klasse)', GroupCategory.FELLOWSHIP);
    addGroup('foreldre', 'ForeldreGruppe', GroupCategory.FELLOWSHIP);

    const uniqueLeaderIds = Array.from(new Set(leaderIds));
    const leaderGroupId = 'gruppeledere';
    const leaderGroupLeader = uniqueLeaderIds[0];
    const leaderGroupDeputy = uniqueLeaderIds[1];
    groups.push({
      id: leaderGroupId,
      name: 'Gruppeledergruppe',
      category: GroupCategory.STRATEGY,
      leaderId: leaderGroupLeader,
      deputyId: leaderGroupDeputy
    });
    uniqueLeaderIds.forEach((personId, idx) => {
      const role = idx === 0 ? GroupRole.LEADER : idx === 1 ? GroupRole.DEPUTY_LEADER : GroupRole.MEMBER;
      groupMembers.push({
        id: crypto.randomUUID(),
        group_id: leaderGroupId,
        person_id: personId,
        role
      });
    });

    const leadershipGroupId = 'lederskap';
    const leadershipMembers = uniqueLeaderIds.length > 0
      ? uniqueLeaderIds.slice(0, 6)
      : pickMembers(6).map(p => p.id);
    groups.push({
      id: leadershipGroupId,
      name: 'Lederskapsgruppe',
      category: GroupCategory.STRATEGY,
      leaderId: leadershipMembers[0],
      deputyId: leadershipMembers[1]
    });
    leadershipMembers.forEach((personId, idx) => {
      groupMembers.push({
        id: crypto.randomUUID(),
        group_id: leadershipGroupId,
        person_id: personId,
        role: idx === 0 ? GroupRole.LEADER : idx === 1 ? GroupRole.DEPUTY_LEADER : GroupRole.MEMBER
      });
    });

    const roleId = (needle: string) => sourceRoles.find(r => r.name.toLowerCase().includes(needle))?.id;
    const addGroupServiceRole = (groupId: string, roleName: string) => {
      const id = roleId(roleName);
      if (!id) return;
      groupServiceRoles.push({
        id: crypto.randomUUID(),
        group_id: groupId,
        service_role_id: id,
        is_active: true
      });
    };

    addGroupServiceRole('team-lovsang', 'lovsang');
    addGroupServiceRole('team-teknikk', 'lyd');
    addGroupServiceRole('team-teknikk', 'bilde');
    addGroupServiceRole('team-vertskap', 'møtevert');
    addGroupServiceRole('team-vertskap', 'kjøkken');
    addGroupServiceRole('team-forbonn', 'forbønn');
    addGroupServiceRole('team-rigg', 'rigg');
    addGroupServiceRole('team-markedsforing', 'markedsføring');
    addGroupServiceRole(barnekirkeId, 'barnekirke');

    return { groups, groupMembers, groupServiceRoles };
  };

  const buildSuggestedDataset = (): AppState => {
    const persons = POPULATED_DATA.persons;
    const families = POPULATED_DATA.families;
    const familyMembers = POPULATED_DATA.familyMembers;
    const serviceRoles = POPULATED_DATA.serviceRoles;
    const eventTemplates = POPULATED_DATA.eventTemplates;

    return {
      ...EMPTY_DATA,
      persons,
      families,
      familyMembers,
      serviceRoles,
      eventTemplates
    };
  };

  const isChild = (person: Person) => {
    const currentYear = new Date().getFullYear();
    const birthYear = person.birth_year ?? (person.birth_date ? Number(person.birth_date.slice(0, 4)) : undefined);
    if (!birthYear || Number.isNaN(birthYear)) return false;
    return currentYear - birthYear < 18;
  };

  const buildFamiliesFromPersons = (persons: Person[], familyCount: number) => {
    const adults = persons.filter(person => !isChild(person));
    const children = persons.filter(person => isChild(person));
    const families: Family[] = [];
    const familyMembers: FamilyMember[] = [];
    let familyIndex = 1;
    let memberIndex = 1;

    for (let i = 0; i < familyCount; i += 1) {
      const primaryAdult = adults.shift();
      if (!primaryAdult) break;

      const familyId = `cf${familyIndex}`;
      families.push({
        id: familyId,
        name: `Familie ${familyIndex}`,
        created_at: new Date().toISOString()
      });

      familyMembers.push({
        id: `cfm${memberIndex++}`,
        family_id: familyId,
        person_id: primaryAdult.id,
        role: FamilyRole.PARENT,
        isPrimaryResidence: true
      });

      const secondaryAdult = adults.shift();
      if (secondaryAdult) {
        familyMembers.push({
          id: `cfm${memberIndex++}`,
          family_id: familyId,
          person_id: secondaryAdult.id,
          role: FamilyRole.PARTNER,
          isPrimaryResidence: true
        });
      }

      const childrenPerFamily = Math.floor(Math.random() * 5); // 0-4
      for (let c = 0; c < childrenPerFamily; c += 1) {
        const child = children.shift();
        if (!child) break;
        familyMembers.push({
          id: `cfm${memberIndex++}`,
          family_id: familyId,
          person_id: child.id,
          role: FamilyRole.CHILD,
          isPrimaryResidence: true
        });
      }

      familyIndex += 1;
    }

    return { families, familyMembers };
  };

  const getNextPersonIndex = (persons: Person[]) => {
    const maxId = persons.reduce((max, person) => {
      const match = person.id.match(/^p(\d+)$/i);
      if (!match) return max;
      return Math.max(max, Number(match[1]));
    }, 0);
    return maxId + 1;
  };

  const handleGenerateSuggestedData = () => {
    if (!confirm('Dette overskriver lokal data med demo-personer og familier, og laster ned backup. Fortsette?')) return;
    const nextState = buildSuggestedDataset();
    nextState.eventOccurrences = [];
    nextState.changeLogs = [];
    onLoadBackup(nextState);
    downloadPayload({
      ...nextState,
      exportDate: new Date().toISOString(),
      version: '0.4'
    });
    setStatus('success');
    setMessage('Demo-personer og familier opprettet og backup lastet ned.');
  };

  const handleGenerateCustomData = () => {
    if (!confirm('Dette overskriver lokal data med et tilpasset demo-sett. Fortsette?')) return;
    const totalPeople = Math.min(DEMO_MAX_PEOPLE, Math.max(0, Math.floor(customPeopleCount)));
    const maxFamilies = Math.floor(totalPeople / 2);
    const totalFamilies = Math.min(maxFamilies, Math.max(0, Math.floor(customFamilyCount)));
    const basePeople = POPULATED_DATA.persons;
    let persons = basePeople.slice(0, totalPeople);
    if (totalPeople > basePeople.length) {
      const extraCount = totalPeople - basePeople.length;
      const extraPeople = generatePersons(extraCount, getNextPersonIndex(basePeople));
      persons = [...basePeople, ...extraPeople];
    }
    const { families, familyMembers } = buildFamiliesFromPersons(persons, totalFamilies);
    const serviceRoles = POPULATED_DATA.serviceRoles;
    const nextState: AppState = {
      ...EMPTY_DATA,
      persons,
      families,
      familyMembers,
      serviceRoles,
      eventTemplates: POPULATED_DATA.eventTemplates,
      assignments: POPULATED_DATA.assignments,
      programItems: POPULATED_DATA.programItems,
      eventOccurrences: [],
      changeLogs: []
    };

    onLoadBackup(nextState);
    setStatus('success');
    setMessage(`Genererte ${persons.length} personer og ${families.length} familier.`);
  };

  const handleGenerateGroupsOnly = () => {
    const current = readLocalState();
    if (current.persons.length === 0) {
      setStatus('error');
      setMessage('Ingen personer funnet. Legg inn personer først.');
      return;
    }
    const roles = current.serviceRoles.length > 0 ? current.serviceRoles : POPULATED_DATA.serviceRoles;
    const { groups, groupMembers, groupServiceRoles } = buildSuggestedGroups(current.persons, roles);
    const nextState: AppState = {
      ...current,
      groups,
      groupMembers,
      groupServiceRoles,
      serviceRoles: roles
    };
    onLoadBackup(nextState);
    setStatus('success');
    setMessage('Demo-grupper opprettet.');
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
      setMessage('Supabase er ikke konfigurert. Sjekk VITE_SUPABASE_URL og VITE_SUPABASE_ANON_KEY i .env.');
      return;
    }
    if (!confirm('Dette vil overskrive lokal data med Supabase-innhold. Fortsette?')) return;

    setStatus('loading');
    setMessage('Henter data...');

    try {
      const [personsResult, groupsResult, membersResult] = await Promise.all([
        supabase.from(supabaseTables.persons).select('*'),
        supabase.from(supabaseTables.groups).select('*'),
        supabase.from(supabaseTables.groupMembers).select('*')
      ]);

      if (personsResult.error) throw personsResult.error;
      if (groupsResult.error) throw groupsResult.error;
      if (membersResult.error) throw membersResult.error;

      const persons = (personsResult.data || []).map(mapPerson);
      const groups = (groupsResult.data || []).map(mapGroup);
      const groupMembers = (membersResult.data || []).map(mapGroupMember);

      const current = readLocalState();
      const nextState: AppState = {
        ...current,
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
      <header className="border-b border-slate-200 pb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Database size={20} className="text-primary" />
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Innstillinger</h2>
            <p className="text-xs text-slate-500 font-medium">Tilpass løsningen og administrer data.</p>
          </div>
        </div>

        {status !== 'idle' && (
          <div className={`px-4 py-2 rounded-theme text-xs font-semibold animate-in slide-in-from-top-2 duration-300 ${
            status === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            status === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
            'bg-primary-light text-primary border border-primary-light'
          }`}>
            {status === 'loading' ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Jobber...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>{message}</span>
                <button onClick={() => setStatus('idle')} className="ml-2 hover:opacity-70">✕</button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Under-faner */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('data')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            activeSubTab === 'data'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Data & Synk
        </button>
        <button
          onClick={() => setActiveSubTab('appearance')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            activeSubTab === 'appearance'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Design & Utseende
        </button>
        <button
          onClick={() => setActiveSubTab('rooms')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            activeSubTab === 'rooms'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Rom
        </button>
      </div>

      {activeSubTab === 'data' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <section className="bg-white border border-gray-200 rounded-theme p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw size={16} className="text-primary" />
                Synkronisering
              </h3>
              <p className="text-xs text-slate-500">
                Velg om nye endringer skal sendes til Supabase eller holdes lokalt i nettleseren.
              </p>
            </div>

            <label className="inline-flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={syncMode === 'supabase'}
                onChange={(e) => handleSyncModeChange(e.target.checked ? 'supabase' : 'local')}
                className="sr-only"
              />
              <div className={`w-12 h-6 rounded-full transition-colors relative ${syncMode === 'supabase' ? 'bg-primary' : 'bg-slate-300'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform ${syncMode === 'supabase' ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
              <div className="text-xs font-semibold text-slate-700">
                {syncMode === 'supabase' ? 'Synk til Supabase' : 'Lokal sandkasse'}
              </div>
            </label>
          </section>

          <section className="bg-white border border-gray-200 rounded-theme p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Download size={16} className="text-primary" />
                Eksport
              </h3>
              <p className="text-xs text-slate-500">
                Last ned data fra nettleseren (localStorage).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleDownloadBackup}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-theme font-medium hover:bg-primary-hover transition-colors"
              >
                <Download size={16} />
                Full eksport
              </button>
              <button
                onClick={handleDownloadPersonsGroups}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-theme font-medium hover:bg-primary-hover transition-colors"
              >
                <Download size={16} />
                Kun personer/grupper
              </button>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-theme p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileDown size={16} className="text-primary" />
                Importer data
              </h3>
              <p className="text-xs text-slate-500">
                Hent inn data og overskriv lokal lagring.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleFetchFromSupabase}
                disabled={status === 'loading'}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-theme font-medium hover:bg-primary-hover transition-colors disabled:opacity-60"
              >
                <CloudDownload size={16} />
                Hent fra Supabase
              </button>
              <button
                onClick={handleLoadBackup}
                disabled={status === 'loading'}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-theme font-medium hover:bg-primary-hover transition-colors disabled:opacity-60"
              >
                <DownloadCloud size={16} />
                Last inn demo-data
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-theme font-medium hover:bg-primary-hover transition-colors"
              >
                <FileDown size={16} />
                Importer fra fil
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                onChange={(e) => handleImportFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-theme p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw size={16} className="text-primary" />
                Slett og rydd
              </h3>
              <p className="text-xs text-slate-500">
                Fjern data eller tøm cache.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleClearPeople}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-rose-600 text-white rounded-theme font-medium hover:bg-rose-700 transition-colors"
              >
                Slett personer
              </button>
              <button
                onClick={handleClearGroups}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-rose-600 text-white rounded-theme font-medium hover:bg-rose-700 transition-colors"
              >
                Slett grupper
              </button>
              <button
                onClick={handleClearImageCache}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-rose-600 text-white rounded-theme font-medium hover:bg-rose-700 transition-colors"
              >
                Tøm bilde-cache
              </button>
              <button
                onClick={handleResetData}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-rose-600 text-white rounded-theme font-medium hover:bg-rose-700 transition-colors"
              >
                Nullstill datasett
              </button>
            </div>
          </section>
        </div>
      ) : activeSubTab === 'appearance' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <section className="bg-white border border-gray-200 rounded-theme p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <Palette size={20} className="text-primary" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Tema-pakker</h3>
                <p className="text-xs text-slate-500">
                  Velg et ferdig oppsett for din menighet.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { name: 'Standard', primary: '#6366f1', radius: '8px', sidebar: 'light', darkMode: false, color: 'bg-indigo-500' },
                { name: 'Moderne Mørk', primary: '#2563eb', radius: '12px', sidebar: 'dark', darkMode: true, color: 'bg-blue-600' },
                { name: 'Skog & Natur', primary: '#059669', radius: '4px', sidebar: 'light', darkMode: false, color: 'bg-emerald-600' },
                { name: 'Høstvarme', primary: '#d97706', radius: '8px', sidebar: 'dark', darkMode: false, color: 'bg-amber-600' },
              ].map(preset => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="flex flex-col items-center gap-2 p-3 rounded-theme border border-slate-200 hover:border-primary-light hover:bg-slate-50 transition-all group"
                >
                  <div className={`w-12 h-12 rounded-full ${preset.color} shadow-inner flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
                    {theme.primary === preset.primary && <Check size={20} />}
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{preset.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-theme p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <Palette size={20} className="text-primary" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Egendefinert Design</h3>
                <p className="text-xs text-slate-500">
                  Finjuster farger og visuelle detaljer.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <label className="block">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">Primærfarge</span>
                  <div className="flex items-center gap-4">
                    <input 
                      type="color" 
                      value={theme.primary}
                      onChange={(e) => updateThemeVariable('--color-primary', e.target.value)}
                      className="w-12 h-12 rounded-theme cursor-pointer border border-slate-200 p-1 bg-white"
                    />
                    <div className="flex-1">
                      <input 
                        type="text" 
                        value={theme.primary}
                        onChange={(e) => updateThemeVariable('--color-primary', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-theme font-mono"
                      />
                    </div>
                  </div>
                </label>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Side-meny (Sidebar)</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSidebarMode('light')}
                      className={`flex-1 py-2 text-xs font-bold rounded-theme border transition-all ${theme.sidebarMode === 'light' ? 'bg-primary-light border-primary-light text-primary shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    >
                      Lys
                    </button>
                    <button
                      onClick={() => setSidebarMode('dark')}
                      className={`flex-1 py-2 text-xs font-bold rounded-theme border transition-all ${theme.sidebarMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    >
                      Mørk
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Mørkt Modus (Beta)</span>
                  <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={theme.darkMode}
                      onChange={(e) => setDarkMode(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-12 h-6 rounded-full transition-colors relative ${theme.darkMode ? 'bg-primary' : 'bg-slate-300'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform ${theme.darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                    <div className="text-xs font-semibold text-slate-700">
                      {theme.darkMode ? 'Aktiv' : 'Av'}
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-6">
                <label className="block">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">Hjørneradius</span>
                  <select 
                    value={theme.radius}
                    onChange={(e) => updateThemeVariable('--radius-md', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-theme bg-white shadow-sm"
                  >
                    <option value="0px">Skarp (0px)</option>
                    <option value="4px">Liten (4px)</option>
                    <option value="8px">Medium (8px)</option>
                    <option value="12px">Stor (12px)</option>
                    <option value="16px">Ekstra stor (16px)</option>
                  </select>
                </label>

                <div className="p-4 bg-slate-50 rounded-theme border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Forhåndsvisning</p>
                  <div className="flex gap-2">
                    <button 
                      className="px-4 py-2 text-xs font-bold text-white transition-all shadow-sm"
                      style={{ backgroundColor: theme.primary, borderRadius: theme.radius }}
                    >
                      Knapp
                    </button>
                    <div 
                      className="w-10 h-10 border border-slate-200 bg-white shadow-sm flex items-center justify-center"
                      style={{ borderRadius: theme.radius }}
                    >
                      <Check size={16} className="text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-theme p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <Sliders size={20} className="text-primary" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Visningsvalg</h3>
                <p className="text-xs text-slate-500">
                  Kontroller hva som vises i de ulike modulene.
                </p>
              </div>
            </div>
            
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-theme bg-slate-50">
              <p className="text-sm text-slate-500 italic">Flere visningsvalg kommer snart...</p>
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <section className="bg-white border border-gray-200 rounded-theme p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Home size={16} className="text-primary" />
                Rom
              </h3>
              <p className="text-xs text-slate-500">
                Opprett og vedlikehold rom som kan brukes på arrangementer.
              </p>
            </div>

            <label className="inline-flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(db.roomConflictCheckEnabled)}
                onChange={(e) => setDb(prev => ({ ...prev, roomConflictCheckEnabled: e.target.checked }))}
                className="sr-only"
              />
              <div className={`w-12 h-6 rounded-full transition-colors relative ${db.roomConflictCheckEnabled ? 'bg-primary' : 'bg-slate-300'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform ${db.roomConflictCheckEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
              <div className="text-xs font-semibold text-slate-700">
                Aktiver konfliktsjekk for rom
              </div>
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs text-slate-600 sm:col-span-2">
                Navn på rom
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-900"
                  placeholder="f.eks. Storsalen"
                />
              </label>
              <label className="text-xs text-slate-600">
                Ca. sitteplasser
                <input
                  type="number"
                  min={0}
                  value={newRoomCapacity}
                  onChange={(e) => setNewRoomCapacity(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-900"
                />
              </label>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleAddRoom}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-theme font-medium hover:bg-primary-hover transition-colors"
              >
                Legg til rom
              </button>
            </div>

            {db.rooms.length === 0 ? (
              <div className="text-center text-xs text-slate-500 py-6 border border-dashed border-slate-200 rounded-theme">
                Ingen rom registrert ennå.
              </div>
            ) : (
              <div className="space-y-3">
                {db.rooms.map(room => (
                  <div key={room.id} className="flex flex-col sm:flex-row sm:items-center gap-3 border border-slate-200 rounded-theme p-3">
                    <input
                      type="text"
                      value={room.name}
                      onChange={(e) => handleUpdateRoom(room.id, { name: e.target.value })}
                      className="flex-1 rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-900"
                    />
                    <input
                      type="number"
                      min={0}
                      value={room.capacity ?? 0}
                      onChange={(e) => handleUpdateRoom(room.id, { capacity: Number(e.target.value) })}
                      className="w-full sm:w-32 rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteRoom(room.id)}
                      className="inline-flex items-center justify-center gap-1 px-3 py-2 text-xs rounded-theme border border-rose-200 text-rose-700 hover:bg-rose-50"
                      title="Slett rom"
                    >
                      <Trash2 size={14} />
                      Slett
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {isCustomModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setIsCustomModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Generer demo-data</h3>
                <p className="text-xs text-slate-500">
                  Velg rask demo eller sett egne tall for personer og familier.
                </p>
              </div>
              <button
                onClick={() => setIsCustomModalOpen(false)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Lukk
              </button>
            </div>

            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-700">Rask demo</div>
              <p className="text-[11px] text-slate-500">
                Bruker standard demo-sett og oppretter personer, familier og grupper.
              </p>
              <button
                onClick={() => {
                  handleGenerateSuggestedData();
                  setIsCustomModalOpen(false);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors"
              >
                Generer rask demo
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs text-slate-600">
                Totalt antall personer
                <input
                  type="number"
                  min={0}
                  max={DEMO_MAX_PEOPLE}
                  value={customPeopleCount}
                  onChange={(e) => setCustomPeopleCount(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900"
                />
              </label>
              <label className="text-xs text-slate-600">
                Antall familier
                <input
                  type="number"
                  min={0}
                  max={Math.floor(customPeopleCount / 2)}
                  value={customFamilyCount}
                  onChange={(e) => setCustomFamilyCount(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsCustomModalOpen(false)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-md font-medium hover:bg-slate-50 transition-colors"
              >
                Avbryt
              </button>
            <button
              onClick={() => {
                handleGenerateCustomData();
                setIsCustomModalOpen(false);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors"
            >
              Generer tilpasset demo
            </button>
            </div>

            <p className="text-[11px] text-slate-500">
              Totalt antall personer inkluderer voksne og barn. Maks antall familier er halvparten av antall personer.
            </p>
            <p className="text-[11px] text-slate-500">
              Barn per familie settes tilfeldig fra 0–4 barn pr familie.
            </p>
            <p className="text-[11px] text-slate-500">
              Maks antall personer er {DEMO_MAX_PEOPLE}.
            </p>
          </div>
        </div>
      )}

      {isGroupsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setIsGroupsModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Opprett demo-grupper</h3>
                <p className="text-xs text-slate-500">
                  Dette overskriver eksisterende grupper og gruppemedlemskap.
                </p>
              </div>
              <button
                onClick={() => setIsGroupsModalOpen(false)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Lukk
              </button>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              Personer og familier endres ikke. Du må ha personer i databasen for å lage grupper.
            </div>
            {!hasLocalPersons() && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
                Ingen personer funnet. Opprett personer først.
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsGroupsModalOpen(false)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-md font-medium hover:bg-slate-50 transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={() => {
                  handleGenerateGroupsOnly();
                  setIsGroupsModalOpen(false);
                }}
                disabled={!hasLocalPersons()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:hover:bg-indigo-600"
              >
                Opprett demo-grupper
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsTab;
