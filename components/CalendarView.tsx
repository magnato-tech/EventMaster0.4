
import React, { useState, useMemo, useEffect } from 'react';
import { AppState, EventOccurrence, ServiceRole, UUID, ProgramItem, GroupCategory, Person, CoreRole, GroupRole, NoticeMessage, AttendanceResponse } from '../types';
import { ChevronLeft, ChevronRight, Plus, UserPlus, X, Trash2, ListChecks, Info, CheckCircle2, Calendar as CalendarIcon, Repeat, LayoutGrid, List as ListIcon, Clock, Users, User, Shield, AlertTriangle, RefreshCw, UserCheck, Sparkles, ArrowRight, Library, GripVertical, Edit2, History, FileDown, MessageSquare } from 'lucide-react';
import PersonAvatar from './PersonAvatar';

// Hjelpefunksjon for å parse datoer i lokal tid (Berlin time)
const parseLocalDate = (dateString: string): Date => {
  // dateString er i format "YYYY-MM-DD"
  const [year, month, day] = dateString.split('-').map(Number);
  // Opprett dato i lokal tid (Berlin time)
  return new Date(year, month - 1, day);
};

// Hjelpefunksjon for å formatere dato til YYYY-MM-DD i lokal tid
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

interface Props {
  db: AppState;
  isAdmin: boolean;
  currentUser: Person;
  onUpdateAssignment: (id: string, personId: string | null) => void;
  onAddAssignment: (occurrenceId: string, roleId: string) => void;
  onDeleteAssignment: (id: string) => void;
  onSyncStaffing: (occurrenceId: string) => void;
  onCreateOccurrence: (templateId: string, date: string, time?: string) => void;
  onUpdateOccurrence: (occurrenceId: string, updates: Partial<EventOccurrence>) => void;
  onDeleteOccurrence: (occurrenceId: string) => void;
  onCreateRecurring: (
    templateId: string,
    startDate: string,
    endDate: string,
    frequencyType: 'weekly' | 'monthly',
    interval: number,
    time?: string
  ) => void;
  onAddProgramItem: (item: ProgramItem) => void;
  onUpdateProgramItem: (id: string, updates: Partial<ProgramItem>) => void;
  onReorderProgramItems: (occurrenceId: string, reorderedItems: ProgramItem[]) => void;
  onDeleteProgramItem: (id: string) => void;
  onAddMessage: (msg: NoticeMessage) => void;
  onUpdateAttendanceResponses: (updater: (prev: AttendanceResponse[]) => AttendanceResponse[]) => void;
  focusOccurrenceId?: UUID | null;
  focusTab?: 'program' | 'staff' | 'history' | null;
  onFocusHandled?: () => void;
}

const CalendarView: React.FC<Props> = ({ 
  db, isAdmin, currentUser, onUpdateAssignment, onAddAssignment, onDeleteAssignment, onSyncStaffing, onCreateOccurrence, onUpdateOccurrence, onDeleteOccurrence, onCreateRecurring, 
  onAddProgramItem, onUpdateProgramItem, onReorderProgramItems, onDeleteProgramItem, onAddMessage, onUpdateAttendanceResponses, focusOccurrenceId, focusTab, onFocusHandled
}) => {
  const [selectedOccId, setSelectedOccId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'staff' | 'program' | 'history'>('program');

  // Modal States
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [editingProgramItem, setEditingProgramItem] = useState<ProgramItem | null>(null);
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [roleInstructionsId, setRoleInstructionsId] = useState<string | null>(null);
  const [isCreateOccurrenceModalOpen, setIsCreateOccurrenceModalOpen] = useState(false);
  const [isEditOccurrenceModalOpen, setIsEditOccurrenceModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [selectedDateForCreate, setSelectedDateForCreate] = useState<string>('');
  const [isSendMessageOpen, setIsSendMessageOpen] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  
  // Form States
  const [progTitle, setProgTitle] = useState('');
  const [progDuration, setProgDuration] = useState(5);
  const [progRoleId, setProgRoleId] = useState<string>('');
  const [progGroupId, setProgGroupId] = useState<string>('');
  const [progPersonId, setProgPersonId] = useState<string>('');
  const [progParticipants, setProgParticipants] = useState<string[]>([]);
  const [progParticipantId, setProgParticipantId] = useState<string>('');
  const [progDescription, setProgDescription] = useState<string>('');
  const [newOccurrenceTemplateId, setNewOccurrenceTemplateId] = useState<string>('');
  const [newOccurrenceDate, setNewOccurrenceDate] = useState<string>('');
  const [newOccurrenceTime, setNewOccurrenceTime] = useState<string>('');
  const [recTemplateId, setRecTemplateId] = useState<string>('');
  const [recStartDate, setRecStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [recStartTime, setRecStartTime] = useState<string>('');
  const [recEndDate, setRecEndDate] = useState<string>('');
  const [recFrequency, setRecFrequency] = useState<'weekly' | 'biweekly' | 'triweekly' | 'quadweekly' | 'monthly'>('weekly');
  const [recMonthWeek, setRecMonthWeek] = useState<number>(1);
  const [editOccurrenceDate, setEditOccurrenceDate] = useState<string>('');
  const [editOccurrenceTime, setEditOccurrenceTime] = useState<string>('');
  const [editOccurrenceTheme, setEditOccurrenceTheme] = useState<string>('');
  const [editOccurrenceBibleVerse, setEditOccurrenceBibleVerse] = useState<string>('');
  const [isEditingOwner, setIsEditingOwner] = useState(false);
  
  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const occurrences = [...db.eventOccurrences].sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
  const selectedOcc = db.eventOccurrences.find(o => o.id === selectedOccId);
  const isOwner = Boolean(selectedOcc && selectedOcc.owner_id === currentUser.id);
  const canEditEvent = Boolean(isAdmin || isOwner);
  const canSendMessage = Boolean(currentUser.is_admin || isOwner);

  const formatTimeForInput = (value?: string) => {
    if (!value) return '';
    return value.slice(0, 5);
  };

  const normalizeTimeInput = (value: string) => {
    if (!value) return '';
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
      return value.slice(0, 5);
    }
    return value;
  };

  const handlePlanRecurring = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recTemplateId || !recEndDate) return;

    const frequencyType = recFrequency === 'monthly' ? 'monthly' : 'weekly';
    let interval: number;
    if (recFrequency === 'monthly') {
      interval = recMonthWeek;
    } else if (recFrequency === 'weekly') {
      interval = 1;
    } else if (recFrequency === 'biweekly') {
      interval = 2;
    } else if (recFrequency === 'triweekly') {
      interval = 3;
    } else {
      interval = 4;
    }

    onCreateRecurring(
      recTemplateId,
      recStartDate,
      recEndDate,
      frequencyType,
      interval,
      recStartTime || undefined
    );

    setIsRecurringModalOpen(false);
    setRecStartTime('');
    setRecEndDate('');
    setRecFrequency('weekly');
    setRecMonthWeek(1);
  };

  useEffect(() => {
    if (!focusOccurrenceId) return;
    const exists = db.eventOccurrences.some(o => o.id === focusOccurrenceId);
    if (exists) {
      setSelectedOccId(focusOccurrenceId);
      setActiveTab(focusTab || 'program');
      setViewMode('list');
    }
    if (onFocusHandled) {
      onFocusHandled();
    }
  }, [focusOccurrenceId, focusTab, db.eventOccurrences, onFocusHandled]);

  const getTemplateTitle = (tid: string | null) => {
    if (!tid) return 'Ukjent';
    return db.eventTemplates.find(t => t.id === tid)?.title || 'Ukjent';
  };

  // Initialize edit fields when selectedOcc changes
  useEffect(() => {
    if (selectedOcc) {
      setEditOccurrenceDate(selectedOcc.date);
      setEditOccurrenceTime(formatTimeForInput(selectedOcc.time));
      setEditOccurrenceTheme(selectedOcc.theme || '');
    }
  }, [selectedOccId]);

  useEffect(() => {
    setIsEditingOwner(false);
  }, [selectedOccId]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDay = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;
    const daysInMonth = lastDayOfMonth.getDate();
    const days = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, prevMonthLastDay - i), isCurrentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    const remainingSlots = 42 - days.length;
    for (let i = 1; i <= remainingSlots; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    return days;
  }, [currentDate]);

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const getOccurrencesForDate = (date: Date) => {
    const dateStr = formatLocalDate(date);
    return db.eventOccurrences.filter(o => o.date === dateStr);
  };

  const handleOpenAddModal = () => {
    setEditingProgramItem(null);
    setProgTitle('');
    setProgDuration(5);
    setProgRoleId('');
    setProgGroupId('');
    setProgPersonId('');
    setProgParticipants([]);
    setProgParticipantId('');
    setProgDescription('');
    setIsProgramModalOpen(true);
  };

  const handleOpenEditModal = (item: ProgramItem) => {
    setEditingProgramItem(item);
    setProgTitle(item.title);
    setProgDuration(Math.max(1, item.duration_minutes || 1));
    setProgRoleId(item.service_role_id || '');
    setProgGroupId(item.group_id || '');
    setProgPersonId(item.person_id || '');
    setProgParticipants(item.participant_ids || []);
    setProgParticipantId('');
    setProgDescription(item.description || '');
    setIsProgramModalOpen(true);
  };

  const handleSaveProgramItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOcc || !progTitle.trim()) return;
    const durationValue = Math.max(1, progDuration || 1);

    if (editingProgramItem) {
      onUpdateProgramItem(editingProgramItem.id, {
        title: progTitle,
        duration_minutes: durationValue,
        service_role_id: progRoleId || null,
        group_id: progGroupId || null,
        person_id: progPersonId || null,
        participant_ids: progParticipants.length > 0 ? progParticipants : undefined,
        description: progDescription.trim() || undefined
      });
    } else {
      const items = db.programItems.filter(p => p.occurrence_id === selectedOcc.id);
      const newItem: ProgramItem = {
        id: crypto.randomUUID(),
        occurrence_id: selectedOcc.id,
        template_id: null,
        title: progTitle,
        duration_minutes: durationValue,
        service_role_id: progRoleId || null,
        group_id: progGroupId || null,
        person_id: progPersonId || null,
        participant_ids: progParticipants.length > 0 ? progParticipants : undefined,
        order: items.length,
        description: progDescription.trim() || undefined
      };
      onAddProgramItem(newItem);
    }
    
    // Reset alle felter
    setProgTitle('');
    setProgDuration(5);
    setProgRoleId('');
    setProgGroupId('');
    setProgPersonId('');
    setProgParticipants([]);
    setProgParticipantId('');
    setProgDescription('');
    setIsProgramModalOpen(false);
    setEditingProgramItem(null);
  };

  const getCategorizedPersons = (roleId?: string | null, groupId?: string | null) => {
    const allActive = db.persons.filter(p => p.is_active);
    let recommended: Person[] = [];
    
    if (roleId) {
      const teamLinks = db.groupServiceRoles.filter(gsr => gsr.service_role_id === roleId);
      const teamIds = teamLinks.map(l => l.group_id);
      const members = db.groupMembers.filter(gm => teamIds.includes(gm.group_id));
      recommended = allActive.filter(p => members.some(m => m.person_id === p.id));
    } else if (groupId) {
      const members = db.groupMembers.filter(gm => gm.group_id === groupId);
      recommended = allActive.filter(p => members.some(m => m.person_id === p.id));
    }
    const others = allActive.filter(p => !recommended.some(r => r.id === p.id));
    return { recommended, others };
  };

  const formatTimeFromOffset = (offsetMinutes: number) => {
    const baseHour = 11;
    const baseMinute = 0;
    const totalMinutes = baseHour * 60 + baseMinute + offsetMinutes;
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = Math.floor(totalMinutes % 60);
    return `${h.toString().padStart(2, '0')}.${m.toString().padStart(2, '0')}`;
  };

  // Reordering logic
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex && selectedOcc) {
      const items = [...programWithTimes];
      const [reorderedItem] = items.splice(draggedIndex, 1);
      items.splice(dragOverIndex, 0, reorderedItem);
      onReorderProgramItems(selectedOcc.id, items);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const programWithTimes = useMemo(() => {
    if (!selectedOcc) return [];
    const items = db.programItems
      .filter(p => p.occurrence_id === selectedOcc.id)
      .sort((a, b) => a.order - b.order);
    let currentOffset = 0;
    return items.map((item, idx) => {
      let startTimeOffset = currentOffset;
      if (idx === 0 && item.order === 0) startTimeOffset = -item.duration_minutes;
      const formattedTime = formatTimeFromOffset(startTimeOffset);
      if (idx === 0 && item.order === 0) currentOffset = 0;
      else currentOffset += item.duration_minutes;
      return { ...item, formattedTime };
    });
  }, [selectedOcc, db.programItems]);

  useEffect(() => {
    if (!selectedOcc || selectedOcc.owner_id) return;
    const meetingLeadRole = db.serviceRoles.find(r => r.name.trim().toLowerCase() === 'møteleder');
    if (!meetingLeadRole) return;
    const leaderAssignment = db.assignments.find(a =>
      a.occurrence_id === selectedOcc.id &&
      a.service_role_id === meetingLeadRole.id &&
      a.person_id
    );
    if (!leaderAssignment?.person_id) return;
    onUpdateOccurrence(selectedOcc.id, { owner_id: leaderAssignment.person_id });
  }, [selectedOcc, db.serviceRoles, db.assignments, onUpdateOccurrence]);

  const staffingData = useMemo(() => {
    if (!selectedOcc) return { programLinked: [], manual: [] };
    const programRoleIds = new Set(
      db.programItems
        .filter(p => p.occurrence_id === selectedOcc.id && p.service_role_id)
        .map(p => p.service_role_id)
    );
    const allAssignments = db.assignments.filter(a => a.occurrence_id === selectedOcc.id);
    const programLinked = allAssignments.filter(a => programRoleIds.has(a.service_role_id));
    const manual = allAssignments.filter(a => !programRoleIds.has(a.service_role_id));
    return { programLinked, manual };
  }, [selectedOcc, db.programItems, db.assignments]);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceResponse>();
    (db.attendanceResponses || []).forEach(res => {
      map.set(`${res.occurrence_id}:${res.person_id}:${res.service_role_id}`, res);
    });
    return map;
  }, [db.attendanceResponses]);

  const getAttendanceStatusLabel = (personId?: string | null, roleId?: string | null) => {
    if (!selectedOcc || !personId || !roleId) {
      return { label: 'Ikke tildelt', tone: 'bg-amber-100 text-amber-700' };
    }
    const response = attendanceMap.get(`${selectedOcc.id}:${personId}:${roleId}`);
    const status = response?.status || 'not_sent';
    switch (status) {
      case 'pending':
        return { label: 'Ikke svart', tone: 'bg-slate-100 text-slate-600' };
      case 'accepted':
        return { label: 'Akseptert', tone: 'bg-emerald-100 text-emerald-700' };
      case 'declined':
        return { label: 'Avvist', tone: 'bg-rose-100 text-rose-700' };
      case 'withdrawn':
        return { label: 'Frafalt', tone: 'bg-amber-100 text-amber-700' };
      case 'not_sent':
      default:
        return { label: 'Ikke sendt', tone: 'bg-slate-100 text-slate-600' };
    }
  };

  const programStaffRows = useMemo(() => {
    if (!selectedOcc) return [];
    const sorted = [...staffingData.programLinked].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    const rows = sorted.flatMap(assign => {
      const programItem = db.programItems.find(p => p.occurrence_id === selectedOcc.id && p.service_role_id === assign.service_role_id);
      const participants = programItem?.participant_ids || [];
      const allPersonIds = [assign.person_id, ...participants].filter(Boolean) as string[];
      const uniquePersonIds = Array.from(new Set(allPersonIds));
      return uniquePersonIds.map((personId, idx) => ({
        assign,
        personId,
        sequence: idx + 1,
        total: uniquePersonIds.length
      }));
    });
    return rows;
  }, [selectedOcc, staffingData.programLinked, db.programItems]);

  const manualStaffRows = useMemo(() => {
    if (!selectedOcc) return [];
    return staffingData.manual.flatMap(assign => {
      const personId = assign.person_id;
      return [{
        assign,
        personId,
        sequence: 1,
        total: 1
      }];
    });
  }, [selectedOcc, staffingData.manual]);

  const attendancePairs = useMemo(() => {
    if (!selectedOcc) return [];
    const pairs: Array<{ personId: string; roleId: string }> = [];
    const seen = new Set<string>();
    const addPair = (personId?: string | null, roleId?: string | null) => {
      if (!personId || !roleId) return;
      const key = `${personId}:${roleId}`;
      if (seen.has(key)) return;
      seen.add(key);
      pairs.push({ personId, roleId });
    };
    programStaffRows.forEach(row => addPair(row.personId, row.assign.service_role_id));
    manualStaffRows.forEach(row => addPair(row.personId, row.assign.service_role_id));
    return pairs;
  }, [selectedOcc, programStaffRows, manualStaffRows]);

  const handleSendAttendanceRequests = () => {
    if (!selectedOcc || attendancePairs.length === 0) return;
    const now = new Date().toISOString();

    onUpdateAttendanceResponses(prev => {
      const next = [...prev];
      attendancePairs.forEach(pair => {
        const idx = next.findIndex(r =>
          r.occurrence_id === selectedOcc.id &&
          r.person_id === pair.personId &&
          r.service_role_id === pair.roleId
        );
        if (idx === -1) {
          next.push({
            id: crypto.randomUUID(),
            occurrence_id: selectedOcc.id,
            person_id: pair.personId,
            service_role_id: pair.roleId,
            status: 'pending',
            sent_at: now
          });
        } else if (next[idx].status === 'not_sent') {
          next[idx] = { ...next[idx], status: 'pending', sent_at: now };
        }
      });
      return next;
    });

    const recipients = Array.from(new Set(attendancePairs.map(p => p.personId)));
    const title = `Svar på forespørsel: ${selectedOcc.title_override || getTemplateTitle(selectedOcc.template_id)}`;
    const msg: NoticeMessage = {
      id: crypto.randomUUID(),
      sender_id: currentUser.id,
      recipient_ids: recipients,
      title,
      content: 'Du er satt opp på arrangementet. Vennligst svar på forespørselen i appen.',
      created_at: now,
      occurrence_id: selectedOcc.id,
      message_type: 'attendance_request',
      isRead: false
    };
    onAddMessage(msg);
  };

  const eventRoles = useMemo(() => {
    if (!selectedOcc) return [];
    const roleIds = new Set<string>();
    db.programItems
      .filter(p => p.occurrence_id === selectedOcc.id && p.service_role_id)
      .forEach(p => roleIds.add(p.service_role_id as string));
    db.assignments
      .filter(a => a.occurrence_id === selectedOcc.id && a.service_role_id)
      .forEach(a => roleIds.add(a.service_role_id));
    return Array.from(roleIds).map(roleId => {
      const role = db.serviceRoles.find(r => r.id === roleId);
      const recipients = db.assignments
        .filter(a => a.occurrence_id === selectedOcc.id && a.service_role_id === roleId && a.person_id)
        .map(a => a.person_id as string);
      const uniqueRecipients = Array.from(new Set(recipients));
      return { roleId, roleName: role?.name || 'Ukjent rolle', recipients: uniqueRecipients };
    });
  }, [selectedOcc, db.programItems, db.assignments, db.serviceRoles]);

  const openSendMessageModal = () => {
    const allRoleIds = eventRoles.map(r => r.roleId);
    setSelectedRoleIds(new Set(allRoleIds));
    setMessageTitle('');
    setMessageContent('');
    setIsSendMessageOpen(true);
  };

  const handleSendEventMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOcc || !messageTitle.trim() || !messageContent.trim()) return;

    const recipients = new Set<string>();
    eventRoles.forEach(role => {
      if (!selectedRoleIds.has(role.roleId)) return;
      role.recipients.forEach(id => recipients.add(id));
    });

    const createdAt = new Date().toISOString();
    const msg: NoticeMessage = {
      id: crypto.randomUUID(),
      sender_id: currentUser.id,
      recipient_ids: Array.from(recipients),
      title: messageTitle.trim(),
      content: messageContent.trim(),
      created_at: createdAt,
      occurrence_id: selectedOcc.id,
      isRead: false
    };
    onAddMessage(msg);

    setIsSendMessageOpen(false);
  };

  const handleExportPdf = () => {
    if (!selectedOcc) return;
    const title = selectedOcc.title_override || getTemplateTitle(selectedOcc.template_id);
    const dateLabel = new Intl.DateTimeFormat('no-NO', { dateStyle: 'long' }).format(parseLocalDate(selectedOcc.date));
    const timeLabel = selectedOcc.time ? `kl. ${selectedOcc.time}` : '';

    const programRows = programWithTimes.map((item) => {
      const role = db.serviceRoles.find(r => r.id === item.service_role_id);
      const group = db.groups.find(g => g.id === item.group_id);
      const person = db.persons.find(p => p.id === item.person_id);
      return `
        <tr>
          <td>${escapeHtml(item.formattedTime || '')}</td>
          <td>${escapeHtml(item.title || '')}</td>
          <td>${escapeHtml(role?.name || '–')}</td>
          <td>${escapeHtml(person?.name || group?.name || '–')}</td>
        </tr>
      `;
    }).join('');

    const renderStaffRows = (items: typeof staffingData.programLinked) => items.map(assign => {
      const role = db.serviceRoles.find(r => r.id === assign.service_role_id);
      const person = db.persons.find(p => p.id === assign.person_id);
      const { label: status } = getAttendanceStatusLabel(assign.person_id, assign.service_role_id);
      return `
        <tr>
          <td>${escapeHtml(role?.name || '–')}</td>
          <td>${escapeHtml(person?.name || 'Ledig vakt')}</td>
          <td>${escapeHtml(person?.phone || '–')}</td>
          <td>${escapeHtml(status)}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <html>
        <head>
          <title>${escapeHtml(title)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; padding: 24px; }
            h1 { font-size: 20px; margin: 0 0 6px; }
            h2 { font-size: 14px; margin: 18px 0 6px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
            .meta { font-size: 12px; color: #475569; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
            th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
            th { background: #f8fafc; font-weight: 700; font-size: 11px; text-transform: uppercase; color: #64748b; }
            .section { margin-top: 18px; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          <div class="meta">${escapeHtml(dateLabel)} ${escapeHtml(timeLabel)}</div>

          <div class="section">
            <h2>Kjøreplan</h2>
            <table>
              <thead>
                <tr>
                  <th>Tid</th>
                  <th>Post</th>
                  <th>Rolle</th>
                  <th>Navn/Gruppe</th>
                </tr>
              </thead>
              <tbody>
                ${programRows || '<tr><td colspan="4">Ingen program tilgjengelig.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Bemanningsliste – Standard</h2>
            <table>
              <thead>
                <tr>
                  <th>Rolle</th>
                  <th>Navn</th>
                  <th>Mobil</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${renderStaffRows(staffingData.programLinked) || '<tr><td colspan="4">Ingen standard bemanning.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Bemanningsliste – Tillegg</h2>
            <table>
              <thead>
                <tr>
                  <th>Rolle</th>
                  <th>Navn</th>
                  <th>Mobil</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${renderStaffRows(staffingData.manual) || '<tr><td colspan="4">Ingen tilleggsvakter.</td></tr>'}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 200);
  };

  const instructionRole = db.serviceRoles.find(sr => sr.id === roleInstructionsId);

  const logs = useMemo(() => {
    if (!selectedOccId) return [];
    return (db.changeLogs || [])
      .filter(l => l.occurrence_id === selectedOccId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [db.changeLogs, selectedOccId]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 md:pb-0 animate-in fade-in duration-500 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Planleggingskalender</h2>
          <p className="text-xs text-slate-500">Administrer gudstjenester og vaktplaner.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-200 p-1 rounded-theme flex">
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-theme transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}><ListIcon size={16} /></button>
            <button onClick={() => setViewMode('calendar')} className={`p-1.5 rounded-theme transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}><LayoutGrid size={16} /></button>
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex flex-col sm:flex-row gap-2">
              <button 
                onClick={() => {
                  setNewOccurrenceDate(new Date().toISOString().split('T')[0]);
                  setNewOccurrenceTime('');
                  setNewOccurrenceTemplateId(db.eventTemplates[0]?.id || '');
                  setIsCreateOccurrenceModalOpen(true);
                }}
                className="flex-1 p-4 rounded-theme border-2 border-dashed border-primary bg-primary-light hover:bg-primary-light/80 transition-all flex items-center justify-center gap-2 text-primary font-bold"
              >
                <Plus size={18} />
                Ny Arrangement
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const daysUntilSunday = (7 - today.getDay()) % 7;
                  const nextSunday = new Date(today);
                  nextSunday.setDate(today.getDate() + daysUntilSunday);
                  
                  const endDate = new Date(nextSunday);
                  endDate.setMonth(nextSunday.getMonth() + 2);

                  setRecTemplateId(db.eventTemplates[0]?.id || '');
                  setRecStartDate(formatLocalDate(nextSunday));
                  setRecStartTime('11:00');
                  setRecEndDate(formatLocalDate(endDate));
                  setRecFrequency('weekly');
                  setIsRecurringModalOpen(true);
                }}
                className="flex-1 p-4 rounded-theme border border-primary bg-white hover:bg-primary-light transition-all flex items-center justify-center gap-2 text-primary font-bold"
              >
                <Repeat size={18} />
                Planlegg serie
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-left">
            {occurrences.map(occ => (
              <div key={occ.id} className={`relative text-left p-4 rounded-theme border transition-all group ${selectedOccId === occ.id ? 'bg-white border-primary shadow-sm' : 'bg-white border-slate-100 hover:border-primary-light'}`}>
                <button 
                  onClick={() => { setSelectedOccId(occ.id); setActiveTab('program'); }} 
                  className="w-full text-left"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{new Intl.DateTimeFormat('no-NO', { weekday: 'short' }).format(parseLocalDate(occ.date))}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-theme uppercase font-bold ${occ.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{occ.status}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-0.5">{occ.title_override || getTemplateTitle(occ.template_id)}</h3>
                  {occ.theme && (
                    <p className="text-xs text-slate-600 italic mb-1">{occ.theme}</p>
                  )}
                  <p className="text-slate-500 text-xs">
                    {new Intl.DateTimeFormat('no-NO', { day: 'numeric', month: 'short' }).format(parseLocalDate(occ.date))}
                    {occ.time && <span className="ml-2 font-semibold">{occ.time}</span>}
                  </p>
                </button>
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDeleteOccurrence(occ.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-theme transition-all z-10 cursor-pointer"
                    title="Slett arrangement"
                    type="button"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-theme shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
            <h3 className="text-xl font-semibold text-gray-900">
              {new Intl.DateTimeFormat('no-NO', { month: 'long', year: 'numeric' }).format(currentDate)}
            </h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={prevMonth} 
                className="p-2 hover:bg-gray-100 rounded-theme text-gray-600 transition-colors"
                aria-label="Forrige måned"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={nextMonth} 
                className="p-2 hover:bg-gray-100 rounded-theme text-gray-600 transition-colors"
                aria-label="Neste måned"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          
          {/* Kalender-grid: 7 kolonner som fyller hele bredden */}
          <div className="grid grid-cols-7 w-full">
            {/* Dagnavn */}
            {['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'].map(day => (
              <div key={day} className="py-3 px-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-r border-gray-200 last:border-r-0 bg-gray-50">
                <span className="hidden md:inline">{day}</span>
                <span className="md:hidden">{day.substring(0, 3)}</span>
              </div>
            ))}
            
            {/* Kalenderdager */}
            {calendarDays.map((day, i) => {
              const occs = getOccurrencesForDate(day.date);
              const isToday = formatLocalDate(new Date()) === formatLocalDate(day.date);
              return (
                <div 
                  key={i} 
                  className={`min-h-[120px] md:min-h-[140px] p-2 border-b border-r border-gray-200 last:border-r-0 group transition-colors ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'}`}
                >
                  {/* Dagnummer */}
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-sm font-semibold ${isToday ? 'bg-primary text-white rounded-full w-7 h-7 flex items-center justify-center' : day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                      {day.date.getDate()}
                    </span>
                    {isAdmin && day.isCurrentMonth && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const dateStr = formatLocalDate(day.date);
                          setSelectedDateForCreate(dateStr);
                          setNewOccurrenceDate(dateStr);
                          setNewOccurrenceTime('');
                          setNewOccurrenceTemplateId(db.eventTemplates[0]?.id || '');
                          setIsCreateOccurrenceModalOpen(true);
                        }} 
                        className="opacity-0 group-hover:opacity-100 p-1 text-primary hover:bg-primary-light rounded-theme transition-all"
                        aria-label="Legg til arrangement"
                      >
                        <Plus size={14} />
                      </button>
                    )}
                  </div>
                  
                  {/* Event-bokser */}
                  <div className="space-y-1.5">
                    {occs.map(occ => (
                      <div 
                        key={occ.id} 
                        className="relative group/occ"
                      >
                        <button 
                          onClick={() => { setSelectedOccId(occ.id); setActiveTab('program'); }} 
                          className="w-full text-left px-2 py-1.5 rounded-theme text-[10px] font-semibold transition-all truncate hover:opacity-90 text-white"
                          style={{ 
                            backgroundColor: selectedOccId === occ.id 
                              ? (occ.color || '#2563eb')
                              : (occ.color || '#2563eb'),
                            boxShadow: selectedOccId === occ.id 
                              ? `0 0 0 2px ${occ.color || '#2563eb'}80, 0 0 0 4px ${occ.color || '#2563eb'}40`
                              : 'none',
                            filter: selectedOccId === occ.id ? 'brightness(0.9)' : 'none'
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            {occ.time && (
                              <span className="font-bold shrink-0">{occ.time}</span>
                            )}
                            <span className="truncate">{occ.title_override || getTemplateTitle(occ.template_id)}</span>
                          </div>
                        </button>
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onDeleteOccurrence(occ.id);
                            }}
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover/occ:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-theme transition-all z-10"
                            title="Slett arrangement"
                            type="button"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedOcc && (
        <div className="fixed inset-0 md:inset-y-0 md:left-64 md:right-0 z-[60] bg-white flex flex-col animate-in slide-in-from-right duration-300 border-l shadow-2xl">
          <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
            <div className="text-left flex-1">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="px-1.5 py-0.5 bg-primary-light text-primary text-[9px] font-bold uppercase rounded-theme">Planlegging</span>
                {isAdmin ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={editOccurrenceDate || selectedOcc.date}
                      onChange={(e) => {
                        setEditOccurrenceDate(e.target.value);
                        onUpdateOccurrence(selectedOcc.id, { date: e.target.value });
                      }}
                      className="text-xs border border-slate-300 rounded-theme px-2 py-1 focus:ring-1 focus:ring-primary outline-none"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="HH:mm"
                      maxLength={5}
                      value={editOccurrenceTime !== undefined ? editOccurrenceTime : formatTimeForInput(selectedOcc.time)}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setEditOccurrenceTime(nextValue);
                        onUpdateOccurrence(selectedOcc.id, { time: nextValue || undefined });
                      }}
                      onBlur={(e) => {
                        const normalized = normalizeTimeInput(e.target.value);
                        setEditOccurrenceTime(normalized);
                        onUpdateOccurrence(selectedOcc.id, { time: normalized || undefined });
                      }}
                      className="text-xs border border-slate-300 rounded-theme px-2 py-1 focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    {new Intl.DateTimeFormat('no-NO', { dateStyle: 'long' }).format(parseLocalDate(selectedOcc.date))}
                    {selectedOcc.time && <span className="ml-2 font-semibold">{selectedOcc.time}</span>}
                  </p>
                )}
              </div>
              <h3 className="text-xl font-bold text-slate-900">{selectedOcc.title_override || getTemplateTitle(selectedOcc.template_id)}</h3>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-600">Eventleder:</span>
                {isEditingOwner && currentUser.is_admin ? (
                  <select
                    value={selectedOcc.owner_id || ''}
                    onChange={(e) => {
                      const nextOwner = e.target.value || undefined;
                      onUpdateOccurrence(selectedOcc.id, { owner_id: nextOwner });
                      setIsEditingOwner(false);
                    }}
                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-theme outline-none focus:ring-2 focus:ring-primary text-xs"
                  >
                    <option value="">Ikke satt</option>
                    {db.persons
                      .filter(p => p.is_active)
                      .map(person => (
                        <option key={person.id} value={person.id}>{person.name}</option>
                      ))}
                  </select>
                ) : (
                  <span>{db.persons.find(p => p.id === selectedOcc.owner_id)?.name || 'Ikke satt'}</span>
                )}
                {currentUser.is_admin && (
                  <button
                    type="button"
                    onClick={() => setIsEditingOwner(prev => !prev)}
                    className="p-1 text-slate-400 hover:text-primary transition-colors"
                    title="Rediger eventleder"
                  >
                    <Edit2 size={14} />
                  </button>
                )}
              </div>
              {/* Tema-felt (synlig og redigerbart for admin) */}
              {isAdmin ? (
                <div className="mt-2">
                  <input
                    type="text"
                    value={editOccurrenceTheme !== undefined ? editOccurrenceTheme : (selectedOcc.theme || '')}
                    onChange={(e) => {
                      setEditOccurrenceTheme(e.target.value);
                      onUpdateOccurrence(selectedOcc.id, { theme: e.target.value.trim() || undefined });
                    }}
                    placeholder="Tema for dagen..."
                    className="text-sm text-slate-600 italic w-full px-3 py-1.5 border border-slate-200 rounded-theme focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>
              ) : selectedOcc.theme ? (
                <p className="text-sm text-slate-600 italic mt-2">{selectedOcc.theme}</p>
              ) : null}

            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleExportPdf();
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-theme transition-all group cursor-pointer"
                title="Eksporter kjøreplan og bemanning (PDF)"
                type="button"
              >
                <FileDown size={18} />
              </button>
              {canSendMessage && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openSendMessageModal();
                  }}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-theme transition-all group cursor-pointer"
                  title="Send melding til rolleinnhavere"
                  type="button"
                >
                  <MessageSquare size={18} />
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDeleteOccurrence(selectedOcc.id);
                    setSelectedOccId(null);
                  }}
                  className="p-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-theme transition-all group cursor-pointer"
                  title="Slett arrangement"
                  type="button"
                >
                  <Trash2 size={18} />
                </button>
              )}
              <button onClick={() => {
                setEditOccurrenceDate('');
                setEditOccurrenceTime('');
                setSelectedOccId(null);
              }} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-theme transition-all group">
                <X size={20} className="text-slate-600" />
              </button>
            </div>
          </div>
          
          <div className="flex bg-slate-50 border-b shrink-0 px-6">
            <button onClick={() => setActiveTab('program')} className={`px-6 py-3 text-xs font-bold border-b-2 transition-all ${activeTab === 'program' ? 'border-primary text-primary bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>1. Kjøreplan</button>
            <button onClick={() => setActiveTab('staff')} className={`px-6 py-3 text-xs font-bold border-b-2 transition-all ${activeTab === 'staff' ? 'border-primary text-primary bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>2. Bemanningsliste</button>
            <button onClick={() => setActiveTab('history')} className={`px-6 py-3 text-xs font-bold border-b-2 transition-all ${activeTab === 'history' ? 'border-primary text-primary bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>3. Endringslogg</button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-white">
            <div className="max-w-4xl mx-auto">
              {activeTab === 'program' ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center border-b pb-3 border-slate-100">
                    <h2 className="text-base font-bold text-slate-800 uppercase tracking-tight">Programoversikt</h2>
                    {canEditEvent && (
                      <button onClick={handleOpenAddModal} className="px-3 py-1.5 bg-primary text-white rounded-theme text-[11px] font-bold shadow hover:bg-primary-hover transition-all flex items-center gap-1.5">
                        <Plus size={14} /> Ny Aktivitet
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {programWithTimes.map((item, idx) => {
                      const role = db.serviceRoles.find(r => r.id === item.service_role_id);
                      const group = db.groups.find(g => g.id === item.group_id);
                      const person = db.persons.find(p => p.id === item.person_id);
                      const { recommended, others } = getCategorizedPersons(item.service_role_id, item.group_id);
                      const coPeople = (item.participant_ids || [])
                        .map(id => db.persons.find(p => p.id === id))
                        .filter(Boolean) as Person[];
                      
                      const isDragged = draggedIndex === idx;
                      const isOver = dragOverIndex === idx;

                      return (
                        <div 
                          key={item.id} 
                          draggable={canEditEvent}
                          onDragStart={() => handleDragStart(idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDragEnd={handleDragEnd}
                          className={`p-3 bg-white border rounded-theme transition-all text-left group flex items-center gap-4 ${isDragged ? 'opacity-30' : 'opacity-100'} ${isOver ? 'border-primary bg-primary-light/30' : 'border-slate-100 hover:border-primary-light'}`}
                        >
                          {canEditEvent && (
                            <div className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-500">
                              <GripVertical size={16} />
                            </div>
                          )}
                          <div className="flex items-center gap-4 flex-1">
                            {item.duration_minutes > 0 && (
                              <div className="flex flex-col items-center shrink-0 w-14 text-center border-r pr-4">
                                <span className="text-xs font-bold text-primary leading-none mb-1">{item.formattedTime}</span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{item.duration_minutes}m</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center">
                                <h5 className="font-bold text-slate-800 text-sm truncate mr-2">{item.title}</h5>
                                {canEditEvent && (
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => handleOpenEditModal(item)} className="p-1 text-slate-400 hover:text-primary">
                                      <Edit2 size={14}/>
                                    </button>
                                    <button onClick={() => onDeleteProgramItem(item.id)} className="p-1 text-slate-400 hover:text-red-500">
                                      <Trash2 size={14}/>
                                    </button>
                                  </div>
                                )}
                              </div>
                              {item.description && item.description.trim() && (
                                <p className="text-xs text-slate-600 mt-1 mb-1.5 italic">{item.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-1">
                                {role && <span className="text-[9px] text-primary font-bold uppercase tracking-wider bg-primary-light px-1.5 py-0.5 rounded-theme border border-primary-light flex items-center gap-1"><Library size={10}/> {role.name}</span>}
                                {group && <span className="text-[9px] text-teal-600 font-bold uppercase tracking-wider bg-teal-50 px-1.5 py-0.5 rounded-theme border border-teal-100 flex items-center gap-1"><Users size={10}/> {group.name}</span>}
                                
                                <div className="ml-auto min-w-[220px] text-right">
                                  {canEditEvent ? (
                                    <select 
                                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-theme text-[10px] outline-none focus:ring-2 focus:ring-primary font-medium"
                                      value={item.person_id || ''}
                                      onChange={(e) => onUpdateProgramItem(item.id, { person_id: e.target.value || null })}
                                    >
                                      <option value="">Tildel person...</option>
                                      {recommended.length > 0 && (
                                        <optgroup label="Anbefalt Team">
                                          {recommended.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </optgroup>
                                      )}
                                      <optgroup label="Alle Personer">
                                        {others.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                      </optgroup>
                                    </select>
                                  ) : person && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold">
                                      <div className="w-4 h-4 rounded-full bg-primary-light flex items-center justify-center text-[8px] text-primary">{person.name.charAt(0)}</div>
                                      {person.name}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {coPeople.length > 0 && (
                                <div className="mt-1 flex flex-col items-end gap-1 text-[10px] text-slate-600 font-semibold">
                                  {coPeople.map(p => (
                                    <span key={p.id} className="px-1.5 py-0.5 rounded-theme bg-slate-100 text-slate-600">
                                      {p.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : activeTab === 'staff' ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center bg-emerald-600 px-4 py-3 rounded-xl shadow-md text-white">
                    <div className="text-left flex items-center gap-3">
                      <Sparkles size={18} className="text-emerald-200" />
                      <div>
                        <p className="text-[11px] text-emerald-50 leading-tight font-bold">Sanntidssynkronisert med kjøreplanen</p>
                        <p className="text-[9px] text-emerald-100/70">Oppdateres automatisk ved endringer i programmet.</p>
                      </div>
                    </div>
                    <div className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded border border-white/20">
                      Auto-aktiv
                    </div>
                  </div>

                  <section className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Standard bemanning</h4>
                        <p className="text-[9px] text-slate-400 font-semibold">Oppgaver fra kjøreplanen (ikke redigerbar)</p>
                      </div>
                      {canSendMessage && (
                        <button
                          onClick={handleSendAttendanceRequests}
                          disabled={attendancePairs.length === 0}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:text-primary-hover disabled:text-slate-300 disabled:cursor-not-allowed"
                        >
                          <MessageSquare size={12} /> Send forespørsel
                        </button>
                      )}
                    </div>
                    <div className="bg-white border border-slate-200 rounded-theme shadow-sm overflow-x-auto">
                      <table className="min-w-full text-left">
                        <thead className="bg-slate-50/70 text-[10px] text-slate-400 uppercase font-bold">
                          <tr>
                            <th className="px-3 py-2">Rolle</th>
                            <th className="px-3 py-2">Navn</th>
                            <th className="px-3 py-2">Mobil</th>
                            <th className="px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {programStaffRows.map(row => {
                            const role = db.serviceRoles.find(r => r.id === row.assign.service_role_id);
                            const person = db.persons.find(p => p.id === row.personId);
                            const { label: statusLabel, tone: statusTone } = getAttendanceStatusLabel(row.personId, row.assign.service_role_id);
                            return (
                              <tr key={`${row.assign.id}-${row.personId}`}>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <Library size={12} className="text-primary-light" />
                                    <span className="font-semibold text-slate-700">
                                      {role?.name || 'Ukjent rolle'} {row.total > 1 ? `(${row.sequence})` : ''}
                                    </span>
                                    {role && (
                                      <button 
                                        onClick={() => setRoleInstructionsId(role.id)} 
                                        className="text-slate-300 hover:text-primary transition-colors"
                                        title="Se instruks"
                                      >
                                        <div className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center">
                                          <Info size={8} strokeWidth={3} />
                                        </div>
                                      </button>
                                    )}
                                    {!person && <AlertTriangle size={12} className="text-amber-500" />}
                                  </div>
                                </td>
                                <td className={`px-3 py-2 font-semibold ${person ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                                  {person?.name || 'Ledig vakt'}
                                </td>
                                <td className="px-3 py-2 text-slate-500">
                                  {person?.phone || '–'}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`px-2 py-0.5 rounded-theme text-[10px] font-bold w-fit ${statusTone}`}>
                                    {statusLabel}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          {programStaffRows.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-3 py-3 text-xs text-slate-400 font-semibold italic">
                                Ingen oppgaver fra kjøreplanen ennå.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tilleggsvakter</h4>
                        <p className="text-[9px] text-slate-400 font-semibold">Manuelt lagt til (kan redigeres)</p>
                      </div>
                      {canEditEvent && (
                        <button onClick={() => setIsAddRoleModalOpen(true)} className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:text-primary-hover">
                          <Plus size={12} /> Legg til ekstra vakt
                        </button>
                      )}
                    </div>
                    <div className="bg-white border border-slate-200 rounded-theme shadow-sm overflow-x-auto">
                      <table className="min-w-full text-left">
                        <thead className="bg-slate-50/70 text-[10px] text-slate-400 uppercase font-bold">
                          <tr>
                            <th className="px-3 py-2">Rolle</th>
                            <th className="px-3 py-2">Navn</th>
                            <th className="px-3 py-2">Mobil</th>
                            <th className="px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {manualStaffRows.map(row => {
                            const role = db.serviceRoles.find(r => r.id === row.assign.service_role_id);
                            const person = db.persons.find(p => p.id === row.personId);
                            const { recommended, others } = getCategorizedPersons(row.assign.service_role_id);
                            const { label: statusLabel, tone: statusTone } = getAttendanceStatusLabel(row.personId, row.assign.service_role_id);
                            return (
                              <tr key={`${row.assign.id}-${row.personId || 'empty'}`} className={person ? '' : 'bg-amber-50/20'}>
                                <td className="px-3 py-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <Library size={12} className="text-primary-light" />
                                      <span className="font-semibold text-slate-700">
                                        {role?.name || 'Ukjent rolle'} {row.total > 1 ? `(${row.sequence})` : ''}
                                      </span>
                                      {role && (
                                        <button 
                                          onClick={() => setRoleInstructionsId(role.id)} 
                                          className="text-slate-300 hover:text-primary transition-colors"
                                          title="Se instruks"
                                        >
                                          <div className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center">
                                            <Info size={8} strokeWidth={3} />
                                          </div>
                                        </button>
                                      )}
                                      {!person && <AlertTriangle size={12} className="text-amber-500" />}
                                    </div>
                                    {canEditEvent && (
                                      <button
                                        type="button"
                                        onClick={() => onDeleteAssignment(row.assign.id)}
                                        className="p-1 rounded-theme text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                                        title="Slett tilleggsvakt"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  {canEditEvent ? (
                                    <select 
                                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-theme text-[10px] outline-none focus:ring-2 focus:ring-primary font-bold text-slate-700" 
                                      value={row.assign.person_id || ''} 
                                      onChange={(e) => onUpdateAssignment(row.assign.id, e.target.value || null)}
                                    >
                                      <option value="">Tildel person...</option>
                                      {recommended.length > 0 && (
                                        <optgroup label="Anbefalt Team">
                                          {recommended.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </optgroup>
                                      )}
                                      <optgroup label="Alle Personer">
                                        {others.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                      </optgroup>
                                    </select>
                                  ) : (
                                    <span className={`font-semibold ${person ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                                      {person?.name || 'Ledig vakt'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-slate-500">
                                  {person?.phone || '–'}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`px-2 py-0.5 rounded-theme text-[10px] font-bold ${statusTone}`}>
                                    {statusLabel}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          {manualStaffRows.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-3 py-3 text-xs text-slate-400 font-semibold italic">
                                Ingen tilleggsvakter lagt til.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <History size={14} /> Logg over bemanningsendringer
                    </h4>
                  </div>
                  
                  <div className="space-y-3">
                    {logs.length > 0 ? logs.map(log => {
                      const actor = db.persons.find(p => p.id === log.actor_id);
                      return (
                        <div key={log.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-4">
                          <div className="shrink-0">
                            {actor ? (
                              <PersonAvatar person={actor} size={32} className="border border-slate-200" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-slate-200">
                                <User size={14} className="text-slate-400" />
                              </div>
                            )}
                          </div>
                           <div>
                              <p className="text-sm text-slate-700 font-medium">{log.description}</p>
                              <p className="text-[10px] text-slate-400 font-bold mt-1">
                                {new Intl.DateTimeFormat('no-NO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(log.timestamp))}
                              </p>
                           </div>
                        </div>
                      )
                    }) : (
                      <div className="text-center py-16 opacity-30">
                        <History size={32} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-bold">Ingen endringer loggført ennå.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-900 border-t shrink-0 flex justify-end items-center text-white">
            <button onClick={() => setSelectedOccId(null)} className="px-8 py-2.5 bg-primary text-white rounded-theme font-bold text-sm shadow-lg flex items-center gap-2 hover:bg-primary-hover transition-all">
              <CheckCircle2 size={16} /> Ferdig planlagt
            </button>
          </div>
        </div>
      )}

      {isSendMessageOpen && selectedOcc && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative bg-white w-full max-w-md rounded-theme shadow-2xl overflow-hidden text-left animate-in zoom-in-95">
            <div className="p-5 bg-primary text-white flex justify-between items-center">
              <h3 className="text-base font-bold flex items-center gap-2">
                <MessageSquare size={18} /> Send melding til rolleinnhavere
              </h3>
              <button onClick={() => setIsSendMessageOpen(false)} className="p-2 hover:bg-primary-hover rounded-theme transition-all">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={handleSendEventMessage}
              className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Roller</label>
                <div className="space-y-2">
                  {eventRoles.length === 0 && (
                    <p className="text-xs text-slate-400 italic">Ingen roller er satt opp på arrangementet.</p>
                  )}
                  {eventRoles.map(role => {
                    const isChecked = selectedRoleIds.has(role.roleId);
                    return (
                      <label key={role.roleId} className="flex items-center justify-between gap-2 p-2 border border-slate-200 rounded-theme bg-slate-50/50">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedRoleIds(prev => {
                                const next = new Set(prev);
                                if (next.has(role.roleId)) next.delete(role.roleId);
                                else next.add(role.roleId);
                                return next;
                              });
                            }}
                            className="w-4 h-4 text-primary border-slate-300 rounded-theme focus:ring-primary"
                          />
                          <span className="text-xs font-semibold text-slate-700">{role.roleName}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {role.recipients.length} mottaker{role.recipients.length === 1 ? '' : 'e'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Overskrift</label>
                <input
                  required
                  type="text"
                  value={messageTitle}
                  onChange={(e) => setMessageTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-theme outline-none focus:ring-2 focus:ring-primary text-sm"
                  placeholder="F.eks. Oppmøte og info"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Melding</label>
                <textarea
                  required
                  rows={5}
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-theme outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
                  placeholder="Skriv meldingen til rolleinnhaverne..."
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-primary text-white rounded-theme font-bold shadow-lg hover:bg-primary-hover transition-all disabled:bg-slate-300 disabled:cursor-not-allowed"
                disabled={selectedRoleIds.size === 0}
              >
                Send melding
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Instruks-Modal */}
      {roleInstructionsId && instructionRole && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative bg-white w-full max-w-sm rounded-theme shadow-xl overflow-hidden animate-in zoom-in-95 text-left">
            <div className="p-4 bg-primary text-white flex justify-between items-center">
              <div className="flex items-center gap-2"><Info size={18} /><h3 className="text-sm font-bold">Instruks: {instructionRole.name}</h3></div>
              <button onClick={() => setRoleInstructionsId(null)}><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2.5">
                {instructionRole.default_instructions.map((task, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="mt-1 w-4 h-4 rounded-full border-2 border-primary-light flex-shrink-0" />
                    <p className="text-slate-600 text-xs leading-relaxed font-medium">{task}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setRoleInstructionsId(null)} className="w-full py-2 bg-slate-100 text-slate-600 rounded-theme font-bold text-xs">Lukk</button>
            </div>
          </div>
        </div>
      )}

      {/* Velg fra katalog modal */}
      {isAddRoleModalOpen && selectedOcc && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="relative bg-white w-full max-w-sm rounded-theme shadow-xl overflow-hidden text-left animate-in zoom-in-95">
            <div className="p-4 bg-primary text-white flex justify-between items-center"><h3 className="text-sm font-bold uppercase tracking-tight">Velg rolle fra katalog</h3><button onClick={() => setIsAddRoleModalOpen(false)}><X size={18}/></button></div>
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {db.serviceRoles.map(sr => (
                <button key={sr.id} onClick={() => { onAddAssignment(selectedOcc.id, sr.id); setIsAddRoleModalOpen(false); }} className="w-full p-3 rounded-theme border text-left flex justify-between items-center hover:border-primary hover:bg-primary-light transition-all">
                  <div className="font-bold text-slate-800 text-xs">{sr.name}</div>
                  <Plus size={14} className="text-primary" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Program Item Add/Edit Modal */}
      {isProgramModalOpen && selectedOcc && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="relative bg-white w-full max-w-sm rounded-theme shadow-xl overflow-hidden text-left animate-in zoom-in-95">
            <div className="p-4 bg-primary text-white flex justify-between items-center">
              <h3 className="text-sm font-bold">{editingProgramItem ? 'Rediger Aktivitet' : 'Ny Aktivitet'}</h3>
                <button onClick={() => { 
                setIsProgramModalOpen(false); 
                setEditingProgramItem(null);
                // Reset alle felter
                setProgTitle('');
                setProgDuration(5);
                setProgRoleId('');
                setProgGroupId('');
                setProgPersonId('');
                  setProgParticipants([]);
                  setProgParticipantId('');
                setProgDescription('');
              }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveProgramItem} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tittel</label>
                <input 
                  autoFocus 
                  required 
                  type="text" 
                  value={progTitle} 
                  onChange={e => setProgTitle(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-theme text-sm focus:ring-1 focus:ring-primary outline-none" 
                  placeholder="f.eks. Lovsang x3" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Varighet (min)</label>
                <input 
                  required 
                  type="number" 
                  min="1" 
                  value={progDuration} 
                  onChange={e => setProgDuration(Math.max(1, parseInt(e.target.value) || 1))} 
                  className="w-full px-3 py-2 border rounded-theme text-sm focus:ring-1 focus:ring-primary outline-none" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Rolle (Katalog)</label>
                  <select 
                    value={progRoleId} 
                    onChange={e => setProgRoleId(e.target.value)} 
                    className="w-full px-2 py-2 border rounded-theme text-[11px] font-medium focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="">Ingen valgt</option>
                    {db.serviceRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Team (Gruppe)</label>
                  <select 
                    value={progGroupId} 
                    onChange={e => {
                      const groupId = e.target.value;
                      setProgGroupId(groupId);
                      // Auto-utfyll gruppeleder hvis team velges
                      if (groupId) {
                        const leaderMember = db.groupMembers.find(
                          gm => gm.group_id === groupId && gm.role === GroupRole.LEADER
                        );
                        if (leaderMember) {
                          setProgPersonId(leaderMember.person_id);
                        }
                      }
                    }}
                    className="w-full px-2 py-2 border rounded-theme text-[11px] font-medium focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="">Ingen valgt</option>
                    {db.groups.filter(g => g.category === GroupCategory.SERVICE).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ansvarlig person</label>
                <select 
                  value={progPersonId} 
                  onChange={e => setProgPersonId(e.target.value)} 
                  className="w-full px-2 py-2 border rounded-theme text-[11px] font-medium focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="">Ingen valgt</option>
                  {db.persons.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Medansvarlige</label>
                <div className="flex gap-2">
                  <select
                    value={progParticipantId}
                    onChange={(e) => setProgParticipantId(e.target.value)}
                    className="flex-1 px-2 py-2 border rounded-theme text-[11px] font-medium focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="">Velg person...</option>
                    {db.persons
                      .filter(p => p.is_active)
                      .filter(p => p.id !== progPersonId)
                      .filter(p => !progParticipants.includes(p.id))
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!progParticipantId) return;
                      if (progParticipants.includes(progParticipantId)) return;
                      setProgParticipants(prev => [...prev, progParticipantId]);
                      setProgParticipantId('');
                    }}
                    className="px-3 py-2 bg-primary text-white rounded-theme text-[11px] font-bold shadow hover:bg-primary-hover transition-all"
                    title="Legg til medansvarlig"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                {progParticipants.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {progParticipants.map(id => {
                      const person = db.persons.find(p => p.id === id);
                      return (
                        <span key={id} className="inline-flex items-center gap-2 px-2 py-0.5 rounded-theme bg-primary-light text-primary text-[10px] font-semibold">
                          {person?.name || 'Ukjent'}
                          <button
                            type="button"
                            onClick={() => setProgParticipants(prev => prev.filter(pid => pid !== id))}
                            className="text-primary hover:text-primary-hover"
                            title="Fjern"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tekstboks</label>
                <textarea 
                  value={progDescription} 
                  onChange={e => setProgDescription(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-theme text-sm resize-none focus:ring-1 focus:ring-primary outline-none" 
                  placeholder="Skriv inn tekst..."
                  rows={3}
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-primary text-white rounded-theme font-bold text-xs shadow-md hover:bg-primary-hover transition-all">
                {editingProgramItem ? 'Oppdater' : 'Lagre'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Occurrence Modal */}
      {isCreateOccurrenceModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="relative bg-white w-full max-w-md rounded-theme shadow-xl overflow-hidden text-left animate-in zoom-in-95">
            <div className="p-4 bg-primary text-white flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-tight">Ny Arrangement</h3>
              <button onClick={() => {
                setIsCreateOccurrenceModalOpen(false);
                setNewOccurrenceDate('');
                setNewOccurrenceTime('');
                setNewOccurrenceTemplateId('');
              }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (newOccurrenceTemplateId && newOccurrenceDate) {
                onCreateOccurrence(newOccurrenceTemplateId, newOccurrenceDate, newOccurrenceTime || undefined);
                setIsCreateOccurrenceModalOpen(false);
                setNewOccurrenceDate('');
                setNewOccurrenceTime('');
                setNewOccurrenceTemplateId('');
              }
            }} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mal</label>
                <select
                  required
                  value={newOccurrenceTemplateId}
                  onChange={(e) => setNewOccurrenceTemplateId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-theme text-sm focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="">Velg mal...</option>
                  {db.eventTemplates.map(template => (
                    <option key={template.id} value={template.id}>{template.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dato</label>
                <input
                  required
                  type="date"
                  value={newOccurrenceDate}
                  onChange={(e) => setNewOccurrenceDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-theme text-sm focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tidspunkt (valgfritt)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="HH:mm"
                  maxLength={5}
                  value={newOccurrenceTime}
                  onChange={(e) => setNewOccurrenceTime(e.target.value)}
                  onBlur={(e) => setNewOccurrenceTime(normalizeTimeInput(e.target.value))}
                  className="w-full px-3 py-2 border rounded-theme text-sm focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOccurrenceModalOpen(false);
                    setNewOccurrenceDate('');
                    setNewOccurrenceTime('');
                    setNewOccurrenceTemplateId('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-theme text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-theme text-sm font-bold hover:bg-primary-hover transition-all"
                >
                  Opprett
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Planlegg Serie Modal */}
      {isRecurringModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="relative bg-white w-full max-w-md rounded-theme shadow-xl overflow-hidden text-left animate-in zoom-in-95">
            <div className="p-4 bg-primary text-white flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-tight">Planlegg serie</h3>
              <button onClick={() => setIsRecurringModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handlePlanRecurring} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mal</label>
                <select
                  required
                  value={recTemplateId}
                  onChange={(e) => setRecTemplateId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-theme text-sm focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="">Velg mal...</option>
                  {db.eventTemplates.map(template => (
                    <option key={template.id} value={template.id}>{template.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Startdato</label>
                <input
                  required
                  type="date"
                  value={recStartDate}
                  onChange={(e) => setRecStartDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-theme text-sm focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Start tidspunkt (valgfritt)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="HH:mm"
                  maxLength={5}
                  value={recStartTime}
                  onChange={(e) => setRecStartTime(e.target.value)}
                  onBlur={(e) => setRecStartTime(normalizeTimeInput(e.target.value))}
                  className="w-full px-3 py-2 border rounded-theme text-sm focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Siste dato</label>
                <input
                  required
                  type="date"
                  value={recEndDate}
                  onChange={(e) => setRecEndDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-theme text-sm focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Frekvens</label>
                <select
                  value={recFrequency}
                  onChange={(e) => setRecFrequency(e.target.value as typeof recFrequency)}
                  className="w-full px-3 py-2 border rounded-theme text-sm focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="weekly">Hver uke</option>
                  <option value="biweekly">Hver 2. uke</option>
                  <option value="triweekly">Hver 3. uke</option>
                  <option value="quadweekly">Hver 4. uke</option>
                  <option value="monthly">En gang pr måned</option>
                </select>
              </div>
              {recFrequency === 'monthly' ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Uke i måneden</label>
                  <select
                    value={recMonthWeek}
                    onChange={(e) => setRecMonthWeek(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-theme text-sm focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value={1}>1. uke</option>
                    <option value={2}>2. uke</option>
                    <option value={3}>3. uke</option>
                    <option value={4}>4. uke</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    {(() => {
                      const dayNames = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
                      const startDateObj = new Date(recStartDate);
                      const dayName = dayNames[startDateObj.getDay()];
                      return `På ${dayName} i ${recMonthWeek === 1 ? 'første' : recMonthWeek === 2 ? 'andre' : recMonthWeek === 3 ? 'tredje' : 'fjerde'} uke av måneden`;
                    })()}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-slate-500">
                    {recFrequency === 'weekly' && 'Arrangementet vil opprettes hver uke på samme ukedag'}
                    {recFrequency === 'biweekly' && 'Arrangementet vil opprettes hver 2. uke på samme ukedag'}
                    {recFrequency === 'triweekly' && 'Arrangementet vil opprettes hver 3. uke på samme ukedag'}
                    {recFrequency === 'quadweekly' && 'Arrangementet vil opprettes hver 4. uke på samme ukedag'}
                  </p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRecurringModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-theme text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-theme text-sm font-bold hover:bg-primary-hover transition-all"
                >
                  Opprett serie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
