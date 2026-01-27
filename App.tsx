
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppState, Person, GroupCategory, EventOccurrence, ProgramItem, Assignment, UUID, GroupRole, Task, NoticeMessage, CoreRole, ChangeLog, OccurrenceStatus } from './types';
import { getDB, saveDB, performBulkCopy, downloadPersonsAndGroups, exportPersonsAndGroups, ensureAdmin } from './db';
import { queueSupabaseSync } from './lib/supabaseSync';
import IdentityPicker from './components/IdentityPicker';
import Dashboard from './components/Dashboard';
import DashboardView from './components/DashboardView';
import Navigation from './components/Navigation';
import CalendarView from './components/CalendarView';
import MasterMenu from './components/MasterMenu';
import GroupsView from './components/GroupsView';
import YearlyWheelView from './components/YearlyWheelView';
import CommunicationView from './components/CommunicationView';
import SettingsTab from './components/SettingsTab';
import { User, Calendar, Settings, Users, ClipboardList, Target, Bell, BarChart3, Shield, SlidersHorizontal } from 'lucide-react';
import { DEFAULT_EVENT_TEMPLATES } from './scripts/seedEventTemplates';

// Hjelpefunksjon for å parse datoer i lokal tid (Berlin time)
const parseLocalDate = (dateString: string): Date => {
  // dateString er i format "YYYY-MM-DD"
  const [year, month, day] = dateString.split('-').map(Number);
  // Opprett dato i lokal tid (Berlin time)
  return new Date(year, month - 1, day);
};

const App: React.FC = () => {
  const [db, setDb] = useState<AppState>(getDB());
  const [currentUser, setCurrentUser] = useState<Person | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'statistics' | 'calendar' | 'groups' | 'master' | 'wheel' | 'messages' | 'settings'>('dashboard');
  const [syncMode, setSyncMode] = useState<'supabase' | 'local'>('supabase');
  const [initialGroupId, setInitialGroupId] = useState<UUID | null>(null);
  const [initialPersonId, setInitialPersonId] = useState<UUID | null>(null);
  const [calendarFocusOccurrenceId, setCalendarFocusOccurrenceId] = useState<UUID | null>(null);
  const [calendarFocusTab, setCalendarFocusTab] = useState<'program' | 'staff' | 'history' | null>(null);
  const hasHydratedSync = useRef(false);

  useEffect(() => {
    const storedMode = localStorage.getItem('eventmaster_sync_mode');
    if (storedMode === 'local' || storedMode === 'supabase') {
      setSyncMode(storedMode);
    }
  }, []);

  useEffect(() => {
    // Last inn og aktiver tema-innstillinger globalt
    const primary = localStorage.getItem('theme_--color-primary');
    const radius = localStorage.getItem('theme_--radius-md');
    const sidebar = localStorage.getItem('theme_sidebar_mode');
    const dark = localStorage.getItem('theme_dark_mode') === 'true';

    if (primary) {
      document.documentElement.style.setProperty('--color-primary', primary);
      document.documentElement.style.setProperty('--color-primary-hover', primary);
      document.documentElement.style.setProperty('--color-primary-light', `${primary}20`);
    }
    if (radius) document.documentElement.style.setProperty('--radius-md', radius);
    if (sidebar === 'dark') document.documentElement.classList.add('sidebar-dark');
    if (dark) document.documentElement.classList.add('dark-mode');
  }, []);

  useEffect(() => {
    saveDB(db);
    // Gjør eksport-funksjoner tilgjengelige globalt for debugging
    if (typeof window !== 'undefined') {
      (window as any).exportPersonsAndGroups = exportPersonsAndGroups;
      (window as any).downloadPersonsAndGroups = downloadPersonsAndGroups;
    }
  }, [db]);

  useEffect(() => {
    const existingIds = new Set(db.eventTemplates.map(t => t.id));
    const missing = DEFAULT_EVENT_TEMPLATES.filter(t => !existingIds.has(t.id));
    if (missing.length === 0) return;
    setDb(prev => ({
      ...prev,
      eventTemplates: [...prev.eventTemplates, ...missing]
    }));
  }, [db.eventTemplates]);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    setDb(prev => {
      let changed = false;
      const nextOccurrences = prev.eventOccurrences.map(occ => {
        if (!occ.owner_id) return occ;
        const occDate = parseLocalDate(occ.date);
        if (occDate < today) {
          changed = true;
          return { ...occ, owner_id: undefined };
        }
        return occ;
      });

      return changed ? { ...prev, eventOccurrences: nextOccurrences } : prev;
    });
  }, [db.eventOccurrences]);

  useEffect(() => {
    if (!hasHydratedSync.current) {
      hasHydratedSync.current = true;
      return;
    }
    if (syncMode === 'supabase') {
      queueSupabaseSync(db);
    }
  }, [db.persons, db.groups, db.groupMembers, syncMode]);

  useEffect(() => {
    if (!currentUser) return;
    const latest = db.persons.find(p => p.id === currentUser.id);
    if (!latest) return;
    if (
      latest.name !== currentUser.name ||
      latest.email !== currentUser.email ||
      latest.phone !== currentUser.phone ||
      latest.imageUrl !== currentUser.imageUrl ||
      latest.core_role !== currentUser.core_role ||
      latest.is_admin !== currentUser.is_admin ||
      latest.is_active !== currentUser.is_active
    ) {
      setCurrentUser(latest);
    }
  }, [db.persons, currentUser]);

  // AUTOMATISK SYNKRONISERING OG VARSLINGSLOGIKK
  const syncStaffingAndNotify = useCallback((occurrenceId: UUID, state: AppState, actor: Person): AppState => {
    const occ = state.eventOccurrences.find(o => o.id === occurrenceId);
    if (!occ) return state;

    const programItems = state.programItems.filter(p => p.occurrence_id === occurrenceId);
    const existingAssignments = state.assignments.filter(a => a.occurrence_id === occurrenceId);
    const programRoleIds = new Set(programItems.filter(p => p.service_role_id).map(p => p.service_role_id));
    const manualAssignments = existingAssignments.filter(a => !programRoleIds.has(a.service_role_id));
    
    // 1. Aggreger unike [Rolle + Person] fra programmet
    const rolePersonMap = new Map<string, string[]>();
    programItems.forEach(item => {
      if (!item.service_role_id) return;
      if (!rolePersonMap.has(item.service_role_id)) {
        rolePersonMap.set(item.service_role_id, []);
      }
      const assignedPersons = rolePersonMap.get(item.service_role_id)!;
      if (item.person_id && !assignedPersons.includes(item.person_id)) {
        assignedPersons.push(item.person_id);
      }
      (item.participant_ids || []).forEach(participantId => {
        if (!assignedPersons.includes(participantId)) {
          assignedPersons.push(participantId);
        }
      });
    });

    const newAssignments: Assignment[] = [];
    const logs: ChangeLog[] = [];
    const notices: NoticeMessage[] = [];
    const attendanceResponses = [...(state.attendanceResponses || [])];

    rolePersonMap.forEach((personIds, roleId) => {
      personIds.forEach((pId, index) => {
        newAssignments.push({
          id: crypto.randomUUID(),
          occurrence_id: occurrenceId,
          service_role_id: roleId,
          person_id: pId,
          display_order: index + 1
        });
      });
    });

    // 2. Finn endringer for Logg og Varsling
    const roleNames = new Map(state.serviceRoles.map(r => [r.id, r.name]));
    const personNames = new Map(state.persons.map(p => [p.id, p.name]));
    newAssignments.forEach(na => {
      const match = existingAssignments.find(ea => ea.service_role_id === na.service_role_id && ea.person_id === na.person_id);
      if (!match) {
        const roleName = roleNames.get(na.service_role_id) || 'Ukjent rolle';
        const personName = personNames.get(na.person_id!) || 'Ingen';
        const desc = `${roleName} ble satt til ${personName} av ${actor.name}`;
        
        logs.push({
          id: crypto.randomUUID(),
          occurrence_id: occurrenceId,
          actor_id: actor.id,
          timestamp: new Date().toISOString(),
          description: desc
        });

        // Finn Møteleder for varsling
        const motelederRole = state.serviceRoles.find(r => r.name.toLowerCase().includes('møteleder'));
        const motelederAssignment = existingAssignments.find(a => a.service_role_id === motelederRole?.id);

        // Systemmelding til Pastor
        notices.push({
          id: crypto.randomUUID(),
          sender_id: 'system',
          recipient_role: CoreRole.PASTOR,
          title: 'Bemanning oppdatert',
          content: `Endring for ${occ.title_override || 'Gudstjeneste'} (${occ.date}): ${desc}`,
          created_at: new Date().toISOString(),
          occurrence_id: occurrenceId,
          isRead: false
        });

        // Personlig forespørsel til den som har fått oppgaven
        if (na.person_id) {
          const eventTitle = occ.title_override || state.eventTemplates.find(t => t.id === occ.template_id)?.title || 'Arrangement';
          notices.push({
            id: crypto.randomUUID(),
            sender_id: 'system',
            recipient_id: na.person_id,
            title: `Svar på forespørsel: ${eventTitle}`,
            content: `Du er satt opp som ${roleName} på ${eventTitle} (${occ.date}). Vennligst svar i appen.`,
            created_at: new Date().toISOString(),
            occurrence_id: occurrenceId,
            message_type: 'attendance_request',
            isRead: false
          });
        }

        if (na.person_id) {
          const idx = attendanceResponses.findIndex(r =>
            r.occurrence_id === occurrenceId &&
            r.person_id === na.person_id &&
            r.service_role_id === na.service_role_id
          );
          const now = new Date().toISOString();
          if (idx === -1) {
            attendanceResponses.push({
              id: crypto.randomUUID(),
              occurrence_id: occurrenceId,
              person_id: na.person_id,
              service_role_id: na.service_role_id,
              status: 'pending',
              sent_at: now
            });
          } else if (attendanceResponses[idx].status === 'not_sent') {
            attendanceResponses[idx] = { ...attendanceResponses[idx], status: 'pending', sent_at: now, responded_at: undefined };
          }
        }
      }
    });

    return {
      ...state,
      assignments: [
        ...state.assignments.filter(a => a.occurrence_id !== occurrenceId),
        ...manualAssignments,
        ...newAssignments
      ],
      changeLogs: [...(state.changeLogs || []), ...logs],
      noticeMessages: [...notices, ...state.noticeMessages],
      attendanceResponses,
      eventOccurrences: state.eventOccurrences.map(o => o.id === occurrenceId ? { ...o, last_synced_at: new Date().toISOString() } : o)
    };
  }, []);

  const findRecommendedPerson = (serviceRoleId: string, state: AppState): string | null => {
    const teamLinks = state.groupServiceRoles.filter(gsr => gsr.service_role_id === serviceRoleId);
    const teamIds = teamLinks.map(l => l.group_id);
    const members = state.groupMembers.filter(gm => teamIds.includes(gm.group_id));
    if (members.length === 0) return null;
    const leader = members.find(m => m.role === GroupRole.LEADER);
    return leader ? leader.person_id : members[0].person_id;
  };

  const autoFillOccurrence = (occurrenceId: string, state: AppState): AppState => {
    const updatedAssignments = state.assignments.map(a => {
      if (a.occurrence_id === occurrenceId && !a.person_id) {
        return { ...a, person_id: findRecommendedPerson(a.service_role_id, state) };
      }
      return a;
    });

    const updatedProgramItems = state.programItems.map(p => {
      if (p.occurrence_id === occurrenceId && !p.person_id && p.service_role_id) {
        return { ...p, person_id: findRecommendedPerson(p.service_role_id, state) };
      }
      return p;
    });

    return {
      ...state,
      assignments: updatedAssignments,
      programItems: updatedProgramItems
    };
  };

  const handleUpdateAssignment = (id: string, personId: string | null) => {
    setDb(prev => {
      const target = prev.assignments.find(a => a.id === id);
      if (!target || !target.occurrence_id) return prev;
      
      const nextState = {
        ...prev,
        assignments: prev.assignments.map(a => a.id === id ? { ...a, person_id: personId } : a)
      };
      
      // Siden vakter nå styres av programpostene, må vi her også oppdatere relevante programposter hvis de finnes
      const updatedProgramItems = nextState.programItems.map(p => 
        (p.occurrence_id === target.occurrence_id && p.service_role_id === target.service_role_id) 
        ? { ...p, person_id: personId } 
        : p
      );

      return syncStaffingAndNotify(target.occurrence_id, { ...nextState, programItems: updatedProgramItems }, currentUser!);
    });
  };

  const handleDeleteAssignment = (id: string) => {
    if (!confirm('Vil du slette denne tilleggsvakten?')) return;
    setDb(prev => ({
      ...prev,
      assignments: prev.assignments.filter(a => a.id !== id)
    }));
  };

  const handleAddAssignment = (occurrenceId: string, roleId: string) => {
    setDb(prev => {
      const defaultPersonId = findRecommendedPerson(roleId, prev);
      const newState = {
        ...prev,
        assignments: [...prev.assignments, {
          id: crypto.randomUUID(),
          occurrence_id: occurrenceId,
          template_id: null,
          service_role_id: roleId,
          person_id: defaultPersonId
        }]
      };
      return syncStaffingAndNotify(occurrenceId, newState, currentUser!);
    });
  };

  const handleAddProgramItem = (item: ProgramItem) => {
    setDb(prev => {
      const newState = { ...prev, programItems: [...prev.programItems, item] };
      return item.occurrence_id ? syncStaffingAndNotify(item.occurrence_id, newState, currentUser!) : newState;
    });
  };

  const handleUpdateProgramItem = (id: string, updates: Partial<ProgramItem>) => {
    setDb(prev => {
      const target = prev.programItems.find(p => p.id === id);
      const newState = {
        ...prev,
        programItems: prev.programItems.map(p => p.id === id ? { ...p, ...updates } : p)
      };
      return (target?.occurrence_id) ? syncStaffingAndNotify(target.occurrence_id, newState, currentUser!) : newState;
    });
  };

  const handleReorderProgramItems = (occurrenceId: string, reorderedItems: ProgramItem[]) => {
    setDb(prev => {
      const newOrderMap = new Map(reorderedItems.map((item, index) => [item.id, index]));
      const newState = {
        ...prev,
        programItems: prev.programItems.map(p => {
          if (p.occurrence_id === occurrenceId && newOrderMap.has(p.id)) {
            return { ...p, order: newOrderMap.get(p.id)! };
          }
          return p;
        })
      };
      return syncStaffingAndNotify(occurrenceId, newState, currentUser!);
    });
  };

  const handleDeleteProgramItem = (id: string) => {
    setDb(prev => {
      const target = prev.programItems.find(p => p.id === id);
      const newState = {
        ...prev,
        programItems: prev.programItems.filter(p => p.id !== id)
      };
      return (target?.occurrence_id) ? syncStaffingAndNotify(target.occurrence_id, newState, currentUser!) : newState;
    });
  };

  const normalizeTime = (value?: string) => {
    if (!value) return undefined;
    if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value.slice(0, 5);
    if (/^\d{2}:\d{2}$/.test(value)) return value;
    return undefined;
  };

  const handleCreateOccurrence = (templateId: string, date: string, time?: string) => {
    const newId = crypto.randomUUID();
    const template = db.eventTemplates.find(t => t.id === templateId);
    const newOccurrence: EventOccurrence = {
      id: newId,
      template_id: templateId,
      date,
      time: normalizeTime(time),
      status: OccurrenceStatus.DRAFT,
      color: template?.color || '#2563eb' // Arv farge fra template, eller standard blå
    };
    
    let nextDb = {
      ...db,
      eventOccurrences: [...db.eventOccurrences, newOccurrence]
    };
    
    nextDb = performBulkCopy(newOccurrence, nextDb);
    nextDb = autoFillOccurrence(newId, nextDb);
    setDb(nextDb);
  };

  const handleUpdateOccurrence = (occurrenceId: string, updates: Partial<EventOccurrence>) => {
    setDb(prev => ({
      ...prev,
      eventOccurrences: prev.eventOccurrences.map(occ => 
        occ.id === occurrenceId
          ? { ...occ, ...updates, time: normalizeTime(updates.time ?? occ.time) }
          : occ
      )
    }));
  };

  const handleDeleteOccurrence = (occurrenceId: string) => {
    const occ = db.eventOccurrences.find(o => o.id === occurrenceId);
    if (!occ) return;
    
    const title = occ.title_override || db.eventTemplates.find(t => t.id === occ.template_id)?.title || 'Arrangementet';
    const date = new Intl.DateTimeFormat('no-NO', { dateStyle: 'long' }).format(parseLocalDate(occ.date));
    const timeStr = occ.time ? ` kl. ${occ.time}` : '';
    
    // Første bekreftelse: Vil du slette arrangementet?
    if (!confirm(`Vil du slette arrangementet?\n\n"${title}"\n${date}${timeStr}\n\nDette vil også slette alle tilhørende programposter, bemanning og endringslogger.\n\nDenne handlingen kan ikke angres.`)) {
      return;
    }
    
    setDb(prev => ({
      ...prev,
      eventOccurrences: prev.eventOccurrences.filter(o => o.id !== occurrenceId),
      assignments: prev.assignments.filter(a => a.occurrence_id !== occurrenceId),
      programItems: prev.programItems.filter(p => p.occurrence_id !== occurrenceId),
      changeLogs: prev.changeLogs.filter(c => c.occurrence_id !== occurrenceId)
    }));
  };

  const handleCreateRecurringOccurrences = (
    templateId: string, 
    startDate: string, 
    endDate: string,
    frequencyType: 'weekly' | 'monthly',
    interval: number,
    time?: string
  ) => {
    let nextDb = { ...db };
    
    // Parse dates in local time
    const parseLocalDate = (dateString: string): Date => {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    };
    
    const formatLocalDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    let currentDate = parseLocalDate(startDate);
    const endDateObj = parseLocalDate(endDate);
    const startDayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Helper function to get nth occurrence of weekday in month
    const getNthWeekdayInMonth = (year: number, month: number, n: number, targetDayOfWeek: number): Date | null => {
      // Find first occurrence of target weekday in the month
      const firstDay = new Date(year, month, 1);
      const firstDayOfWeek = firstDay.getDay();
      
      // Calculate days to add to get to the first occurrence of target weekday
      let daysToAdd = (targetDayOfWeek - firstDayOfWeek + 7) % 7;
      
      // If first day is the target weekday, daysToAdd is 0
      // Otherwise, calculate the offset
      const firstOccurrence = new Date(year, month, 1 + daysToAdd);
      
      // Add (n-1) weeks to get nth occurrence
      const nthOccurrence = new Date(year, month, firstOccurrence.getDate() + (n - 1) * 7);
      
      // Check if the nth occurrence is still in the same month
      if (nthOccurrence.getMonth() !== month) {
        return null; // Nth occurrence doesn't exist in this month
      }
      
      return nthOccurrence;
    };
    
    const occurrences: { date: Date }[] = [];
    
    if (frequencyType === 'monthly') {
      // Monthly: Find nth occurrence of weekday in each month
      let checkYear = currentDate.getFullYear();
      let checkMonth = currentDate.getMonth();
      const endYear = endDateObj.getFullYear();
      const endMonth = endDateObj.getMonth();
      
      while (checkYear < endYear || (checkYear === endYear && checkMonth <= endMonth)) {
        const nthOccurrence = getNthWeekdayInMonth(checkYear, checkMonth, interval, startDayOfWeek);
        
        if (nthOccurrence && nthOccurrence >= currentDate && nthOccurrence <= endDateObj) {
          occurrences.push({ date: new Date(nthOccurrence) });
        }
        
        // Move to next month
        checkMonth++;
        if (checkMonth > 11) {
          checkMonth = 0;
          checkYear++;
        }
      }
    } else {
      // Weekly: Every N weeks
      const intervalDays = interval * 7;
      
      while (currentDate <= endDateObj) {
        occurrences.push({ date: new Date(currentDate) });
        currentDate.setDate(currentDate.getDate() + intervalDays);
      }
    }
    
    const normalizedTime = normalizeTime(time);
    // Create occurrences
    const template = db.eventTemplates.find(t => t.id === templateId);
    occurrences.forEach(({ date }) => {
      const dateStr = formatLocalDate(date);
      const exists = nextDb.eventOccurrences.some(o => o.template_id === templateId && o.date === dateStr);
      
      if (!exists) {
        const newId = crypto.randomUUID();
        const newOccurrence: EventOccurrence = {
          id: newId,
          template_id: templateId,
          date: dateStr,
          time: normalizedTime,
          status: OccurrenceStatus.DRAFT,
          color: template?.color || '#2563eb' // Arv farge fra template, eller standard blå
        };
        
        nextDb.eventOccurrences.push(newOccurrence);
        nextDb = performBulkCopy(newOccurrence, nextDb);
        nextDb = autoFillOccurrence(newId, nextDb);
      }
    });
    
    setDb(nextDb);
  };

  const handleUpdateTask = (task: Task) => {
    setDb(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === task.id ? task : t)
    }));
  };

  const handleAddTask = (task: Task) => {
    setDb(prev => ({
      ...prev,
      tasks: [...prev.tasks, task]
    }));
  };

  const handleDeleteTask = (id: string) => {
    setDb(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== id)
    }));
  };

  const handleIdentitySelect = (person: Person) => {
    setCurrentUser(person);
    setActiveTab('dashboard');
  };
  
  const handleViewGroup = (groupId: UUID) => {
    setActiveTab('groups');
    setInitialGroupId(groupId);
  };

  const handleViewPerson = (personId: UUID) => {
    setActiveTab('groups');
    setInitialPersonId(personId);
  };

  const handleAddMessage = (msg: NoticeMessage) => {
    setDb(prev => ({
      ...prev,
      noticeMessages: [{ ...msg, isRead: false }, ...prev.noticeMessages]
    }));
  };

  const handleUpdateAttendanceResponses = useCallback((updater: (prev: any[]) => any[]) => {
    setDb(prev => ({
      ...prev,
      attendanceResponses: updater(prev.attendanceResponses || [])
    }));
  }, []);

  const handleDeleteMessage = (id: UUID) => {
    setDb(prev => ({
      ...prev,
      noticeMessages: prev.noticeMessages.filter(m => m.id !== id)
    }));
  };

  const handleLoadBackup = (state: AppState) => {
    setDb(ensureAdmin(state));
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  // Sjekk om det finnes uleste meldinger for den innloggede brukeren
  const hasUnreadMessages = useMemo(() => {
    if (!currentUser) return false;
    
    return db.noticeMessages.some(msg => {
      // Ignorer allerede leste meldinger
      if (msg.isRead === true) return false;
      
      // Ignorer meldinger sendt av brukeren selv
      if (msg.sender_id === currentUser.id) return false;
      
      // Sjekk personlig melding
      if (msg.recipient_id === currentUser.id) return true;
      if (msg.recipient_ids && msg.recipient_ids.includes(currentUser.id)) return true;

      // Sjekk om meldingen er relevant for brukerens rolle
      if (currentUser.core_role === CoreRole.ADMIN || currentUser.core_role === CoreRole.PASTOR) {
        // Admin/Pastor kan se systemmeldinger og meldinger rettet til ADMIN eller PASTOR
        return msg.sender_id === 'system' || msg.recipient_role === CoreRole.PASTOR || msg.recipient_role === CoreRole.ADMIN || msg.recipient_role === CoreRole.TEAM_LEADER;
      }
      if (currentUser.core_role === CoreRole.TEAM_LEADER) {
        // Team Leader kan se meldinger rettet til TEAM_LEADER
        return msg.recipient_role === CoreRole.TEAM_LEADER;
      }
      return false;
    });
  }, [db.noticeMessages, currentUser]);

  const handleMarkMessagesAsRead = useCallback(() => {
    if (!currentUser) return;
    
    setDb(prev => ({
      ...prev,
      noticeMessages: prev.noticeMessages.map(msg => {
        // Marker kun relevante meldinger som leste
        if (msg.isRead === true) return msg; // Allerede lest
        if (msg.sender_id === currentUser.id) return msg; // Sendt av brukeren selv
        
        const isPersonal = msg.recipient_id === currentUser.id || (msg.recipient_ids || []).includes(currentUser.id);
        let isRelevantRole = false;

        // Sjekk om meldingen er relevant for brukerens rolle
        if (currentUser.core_role === CoreRole.ADMIN || currentUser.core_role === CoreRole.PASTOR) {
          isRelevantRole = msg.sender_id === 'system' || msg.recipient_role === CoreRole.PASTOR || msg.recipient_role === CoreRole.ADMIN || msg.recipient_role === CoreRole.TEAM_LEADER;
        } else if (currentUser.core_role === CoreRole.TEAM_LEADER) {
          isRelevantRole = msg.recipient_role === CoreRole.TEAM_LEADER;
        }

        if (isPersonal || isRelevantRole) {
          return { ...msg, isRead: true };
        }
        return msg;
      })
    }));
  }, [currentUser, setDb]);

  useEffect(() => {
    if (activeTab !== 'groups') {
      setInitialGroupId(null);
      setInitialPersonId(null);
    }
  }, [activeTab]);

  if (!currentUser) {
    return <IdentityPicker persons={db.persons} onSelect={handleIdentitySelect} />;
  }

  const canSeeMessages = currentUser.core_role === CoreRole.ADMIN || currentUser.core_role === CoreRole.PASTOR || currentUser.core_role === CoreRole.TEAM_LEADER;
  const userGroupMemberships = db.groupMembers.filter(gm => gm.person_id === currentUser.id);
  const isGroupLeader = userGroupMemberships.some(gm => gm.role === GroupRole.LEADER);
  const isDeputyLeader = userGroupMemberships.some(gm => gm.role === GroupRole.DEPUTY_LEADER);
  const canManageGroups = currentUser.is_admin || isGroupLeader || isDeputyLeader;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-left">
      <nav className="hidden md:flex flex-col w-64 bg-white border-r h-screen sticky top-0">
        <div className="p-6">
          <h1 className="text-xl font-bold theme-primary leading-tight uppercase tracking-tighter">EventMaster<br/><span className="opacity-60">LMK</span></h1>
        </div>
        
        <div className="flex-1 px-4 space-y-1 py-2">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<ClipboardList size={18}/>} label="Min side" />
          {currentUser.is_admin && (
            <NavItem active={activeTab === 'statistics'} onClick={() => setActiveTab('statistics')} icon={<BarChart3 size={18}/>} label="Dashboard" />
          )}
          <NavItem active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<Calendar size={18}/>} label="Kalender" />
          {canManageGroups && (
            <NavItem active={activeTab === 'groups'} onClick={() => { setActiveTab('groups'); setInitialPersonId(null); setInitialGroupId(null); }} icon={<Users size={18}/>} label="Folk" />
          )}
          <NavItem 
            active={activeTab === 'messages'} 
            onClick={() => {
              setActiveTab('messages');
              handleMarkMessagesAsRead();
            }} 
            icon={<Bell size={18} className={hasUnreadMessages ? '!text-amber-400' : ''} />} 
            label="Oppslag & Dialog" 
          />
          {currentUser.is_admin && (
            <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SlidersHorizontal size={18}/>} label="Innstillinger" />
          )}
          {currentUser.is_admin && (
            <NavItem active={activeTab === 'wheel'} onClick={() => setActiveTab('wheel')} icon={<Target size={18}/>} label="Årshjul" />
          )}
          {currentUser.is_admin && (
            <NavItem active={activeTab === 'master'} onClick={() => setActiveTab('master')} icon={<Settings size={18}/>} label="Master-oppsett" />
          )}
        </div>

        <div className="p-4 border-t bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-primary font-bold text-xs">
              {currentUser.name.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{currentUser.is_admin ? 'Admin' : 'Frivillig'}</p>
            </div>
            <button onClick={() => setCurrentUser(null)} className="text-slate-400 hover:text-slate-600">
              <User size={16} />
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        {syncMode === 'local' && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Lokal sandkasse aktiv – endringer synkes ikke til Supabase.
          </div>
        )}
        {activeTab === 'dashboard' && (
          <Dashboard
            db={db}
            currentUser={currentUser}
            onGoToWheel={() => setActiveTab('wheel')}
            onLogout={() => setCurrentUser(null)}
            onViewGroup={handleViewGroup}
          />
        )}
        {activeTab === 'statistics' && <DashboardView db={db} />}
        {activeTab === 'calendar' && (() => {
          const hasGroupLeaderRights = currentUser.is_admin || isGroupLeader || isDeputyLeader;
          
          return (
            <CalendarView 
              db={db} 
              isAdmin={hasGroupLeaderRights} 
              currentUser={currentUser}
              focusOccurrenceId={calendarFocusOccurrenceId}
              focusTab={calendarFocusTab}
              onFocusHandled={() => {
                setCalendarFocusOccurrenceId(null);
                setCalendarFocusTab(null);
              }}
            onUpdateAssignment={handleUpdateAssignment}
            onAddAssignment={handleAddAssignment}
            onDeleteAssignment={handleDeleteAssignment}
            onSyncStaffing={() => {}} // Nå automatisk
            onCreateOccurrence={handleCreateOccurrence}
            onUpdateOccurrence={handleUpdateOccurrence}
            onDeleteOccurrence={handleDeleteOccurrence}
            onCreateRecurring={handleCreateRecurringOccurrences}
            onAddProgramItem={handleAddProgramItem}
            onUpdateProgramItem={handleUpdateProgramItem}
            onReorderProgramItems={handleReorderProgramItems}
            onDeleteProgramItem={handleDeleteProgramItem}
            onAddMessage={handleAddMessage}
            onUpdateAttendanceResponses={handleUpdateAttendanceResponses}
          />
          );
        })()}
        {activeTab === 'groups' && (() => {
          if (!canManageGroups) {
            return (
              <div className="p-8 text-center text-slate-500">
                <Shield size={48} className="mx-auto mb-4 text-slate-300" />
                <h3 className="text-xl font-bold mb-2">Tilgang nektet</h3>
                <p className="text-sm">Du har ikke tilgang til medlemsregisteret.</p>
              </div>
            );
          }
          
          const userLeaderGroups = userGroupMemberships
            .filter(gm => gm.role === GroupRole.LEADER || gm.role === GroupRole.DEPUTY_LEADER)
            .map(gm => gm.group_id);
          
          return (
            <GroupsView 
              db={db} 
              setDb={setDb} 
              isAdmin={currentUser.is_admin} 
              currentUserId={currentUser.id}
              userLeaderGroups={userLeaderGroups}
              initialViewGroupId={initialGroupId} 
              initialPersonId={currentUser.is_admin ? initialPersonId : null} 
              onViewPerson={currentUser.is_admin ? handleViewPerson : undefined} 
            />
          );
        })()}
        {activeTab === 'wheel' && <YearlyWheelView db={db} isAdmin={currentUser.is_admin} onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} />}
        {activeTab === 'messages' && (
          <CommunicationView
            db={db}
            currentUser={currentUser}
            onAddMessage={handleAddMessage}
            onDeleteMessage={handleDeleteMessage}
            onMarkMessagesAsRead={handleMarkMessagesAsRead}
            onViewOccurrence={(occurrenceId, tab) => {
              setCalendarFocusOccurrenceId(occurrenceId);
              setCalendarFocusTab(tab || null);
              setActiveTab('calendar');
            }}
            onUpdateAttendanceResponses={handleUpdateAttendanceResponses}
          />
        )}
        {activeTab === 'settings' && currentUser.is_admin && (
          <SettingsTab
            onLoadBackup={handleLoadBackup}
            syncMode={syncMode}
            onSyncModeChange={(mode) => {
              setSyncMode(mode);
              localStorage.setItem('eventmaster_sync_mode', mode);
            }}
          />
        )}
        {activeTab === 'master' && currentUser.is_admin && (
          <MasterMenu 
            db={db} 
            setDb={setDb} 
            onCreateRecurring={handleCreateRecurringOccurrences}
            onUpdateOccurrence={handleUpdateOccurrence}
            onAddProgramItem={handleAddProgramItem}
            onUpdateProgramItem={handleUpdateProgramItem}
            onDeleteProgramItem={handleDeleteProgramItem}
          />
        )}
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 px-1 z-50 shadow-2xl">
        <MobileNavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<ClipboardList size={18}/>} label="Min side" />
        {currentUser.is_admin && (
          <MobileNavItem active={activeTab === 'statistics'} onClick={() => setActiveTab('statistics')} icon={<BarChart3 size={18}/>} label="Dashboard" />
        )}
        <MobileNavItem active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<Calendar size={18}/>} label="Kalender" />
        {canManageGroups && (
          <MobileNavItem active={activeTab === 'groups'} onClick={() => { setActiveTab('groups'); setInitialPersonId(null); setInitialGroupId(null); }} icon={<Users size={18}/>} label="Folk" />
        )}
        <MobileNavItem 
          active={activeTab === 'messages'} 
          onClick={() => {
            setActiveTab('messages');
            handleMarkMessagesAsRead();
          }} 
          icon={<Bell size={18} className={hasUnreadMessages ? '!text-amber-400' : ''} />} 
          label="Melding" 
        />
        {currentUser.is_admin && (
          <MobileNavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SlidersHorizontal size={18}/>} label="Innstillinger" />
        )}
        {currentUser.is_admin && (
          <MobileNavItem active={activeTab === 'wheel'} onClick={() => setActiveTab('wheel')} icon={<Target size={18}/>} label="Årshjul" />
        )}
        {currentUser.is_admin && (
          <MobileNavItem active={activeTab === 'master'} onClick={() => setActiveTab('master')} icon={<Settings size={18}/>} label="Master" />
        )}
      </div>
    </div>
  );
};

const NavItem: React.FC<{active: boolean, onClick: () => void, icon: React.ReactNode, label: string}> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-theme transition-all ${active ? 'bg-primary-light text-primary font-bold text-sm shadow-sm' : 'text-slate-600 hover:bg-slate-100 text-sm font-medium'}`}
  >
    <span className="[&>svg]:shrink-0">{icon}</span>
    <span>{label}</span>
  </button>
);

const MobileNavItem: React.FC<{active: boolean, onClick: () => void, icon: React.ReactNode, label: string}> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 px-3 py-1 rounded-theme transition-all ${active ? 'text-primary' : 'text-slate-400'}`}
  >
    <span className="[&>svg]:shrink-0">{icon}</span>
    <span className="text-[10px] font-bold">{label}</span>
  </button>
);

export default App;
