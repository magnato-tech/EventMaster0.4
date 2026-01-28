
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AppState, Group, GroupCategory, GroupCategoryValue, GroupRole, GroupMember, ServiceRole, UUID, Person, CoreRole, GatheringPattern, OccurrenceStatus, EventOccurrence, Assignment, Family, FamilyMember, FamilyRole } from '../types';
import { saveImageLibraryEntry, removeImageLibraryEntry } from '../db';
import { Users, Shield, Heart, Plus, X, Search, Edit2, Star, Library, ChevronDown, Calendar, Repeat, ShieldCheck, Link as LinkIcon, ExternalLink, ListChecks, Mail, Phone, ArrowLeft, Clock, CheckCircle2, ChevronRight, User, Trash2, FileText, Info, UserPlus, MapPin, Home, Save, Baby, Filter, LayoutGrid, Table, Tag } from 'lucide-react';

interface Props {
  db: AppState;
  setDb: React.Dispatch<React.SetStateAction<AppState>>;
  isAdmin: boolean;
  currentUserId?: UUID;
  userLeaderGroups?: UUID[]; // Grupper hvor brukeren er leder/nestleder
  initialViewGroupId?: UUID | null;
  initialPersonId?: UUID | null;
  onViewPerson?: (personId: UUID) => void;
}

const GroupsView: React.FC<Props> = ({ db, setDb, isAdmin, currentUserId, userLeaderGroups = [], initialViewGroupId, initialPersonId, onViewPerson }) => {
  const [activeTab, setActiveTab] = useState<'persons' | 'groups' | 'roles'>('persons');
  const [selectedGroupTags, setSelectedGroupTags] = useState<Set<string>>(new Set(['Alle']));
  const [groupViewMode, setGroupViewMode] = useState<'tiles' | 'table'>('tiles');
  const [isAddingCustomTag, setIsAddingCustomTag] = useState(false);
  const [newCustomTag, setNewCustomTag] = useState('');
  const [viewingFamilyFromPerson, setViewingFamilyFromPerson] = useState<UUID | null>(null);
  const isScopedLeader = !isAdmin && userLeaderGroups.length > 0;
  const canManageGroup = useCallback((groupId?: UUID | null) => {
    if (!groupId) return false;
    return isAdmin || userLeaderGroups.includes(groupId);
  }, [isAdmin, userLeaderGroups]);
  
  // Modal & View States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [manageGroupId, setManageGroupId] = useState<UUID | null>(null);
  const [viewingGroupId, setViewingGroupId] = useState<UUID | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<UUID | null>(null);
  const [isCreateServiceRoleModalOpen, setIsCreateServiceRoleModalOpen] = useState(false);
  const [viewingRoleId, setViewingRoleId] = useState<UUID | null>(null);
  const [isCreatePersonModalOpen, setIsCreatePersonModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [newPersonImageUrl, setNewPersonImageUrl] = useState('');
  const gatheringSectionRef = useRef<HTMLDivElement | null>(null);
  const [editingPersonImageUrl, setEditingPersonImageUrl] = useState('');
  
  // Familie States
  const [isCreateFamilyModalOpen, setIsCreateFamilyModalOpen] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newlyCreatedFamilyId, setNewlyCreatedFamilyId] = useState<UUID | null>(null);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [selectedFamilyForMember, setSelectedFamilyForMember] = useState<UUID | null>(null);
  const [memberPersonSearch, setMemberPersonSearch] = useState('');
  const [memberPersonId, setMemberPersonId] = useState<UUID | null>(null);
  const [memberFamilyRole, setMemberFamilyRole] = useState<FamilyRole>(FamilyRole.CHILD);
  const [memberIsSecondaryResidence, setMemberIsSecondaryResidence] = useState(false);
  const [isNewPerson, setIsNewPerson] = useState(false);
  const [newPersonEmail, setNewPersonEmail] = useState('');
  const [newPersonPhone, setNewPersonPhone] = useState('');
  const [newPersonBirthYear, setNewPersonBirthYear] = useState('');
  const [newPersonBirthDate, setNewPersonBirthDate] = useState('');
  const [viewingFamilyId, setViewingFamilyId] = useState<UUID | null>(null);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [isEditingFamilyAddress, setIsEditingFamilyAddress] = useState(false);
  const [editingFamilyStreetAddress, setEditingFamilyStreetAddress] = useState('');
  const [editingFamilyPostalCode, setEditingFamilyPostalCode] = useState('');
  const [editingFamilyCity, setEditingFamilyCity] = useState('');

  // Samlingsplanlegging State (Manage mode only)
  const [tempPattern, setTempPattern] = useState<GatheringPattern | null>(null);
  const [syncCount, setSyncCount] = useState(4);

  // Form States
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState<GroupCategoryValue | ''>('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupLink, setNewGroupLink] = useState('');
  const [newGroupColor, setNewGroupColor] = useState<string>('#2563eb');
  const [newGroupLeaderId, setNewGroupLeaderId] = useState<UUID | null>(null);
  const [newGroupMemberIds, setNewGroupMemberIds] = useState<UUID[]>([]);
  const [newGroupFrequency, setNewGroupFrequency] = useState<number>(1);
  const [newGroupStartDate, setNewGroupStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newGroupStartTime, setNewGroupStartTime] = useState<string>('');
  const [newGroupEndTime, setNewGroupEndTime] = useState<string>('');
  const [newGroupEndDate, setNewGroupEndDate] = useState<string>('');
  const [isDeletingGroup, setIsDeletingGroup] = useState<UUID | null>(null);
  const [isAddingMemberToGroup, setIsAddingMemberToGroup] = useState(false);
  const [memberSearchForGroup, setMemberSearchForGroup] = useState('');
  const [newGroupMemberSearch, setNewGroupMemberSearch] = useState('');
  
  // Redigeringsstates for gruppe
  const [editingGroupName, setEditingGroupName] = useState('');
  const [editingGroupCategory, setEditingGroupCategory] = useState<GroupCategoryValue>(GroupCategory.SERVICE);
  const [editingGroupDescription, setEditingGroupDescription] = useState('');
  const [editingGroupLink, setEditingGroupLink] = useState('');
  const [editingGroupColor, setEditingGroupColor] = useState<string>('#2563eb');
  const [isGatheringPatternExpanded, setIsGatheringPatternExpanded] = useState(false);

  // Search States
  const [memberSearch, setMemberSearch] = useState('');
  const [personSearch, setPersonSearch] = useState('');
  const [roleSearch, setRoleSearch] = useState('');
  // Removed top-level filters; using column filters instead
  const [sortColumn, setSortColumn] = useState<'name' | 'role' | 'birthDate' | 'groups' | 'address' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    birthDate: true,
    role: true,
    groups: true,
    email: true,
    phone: true,
    address: false
  });
  const [openColumnFilter, setOpenColumnFilter] = useState<'birthDate' | 'role' | 'groups' | null>(null);
  const [columnBirthYears, setColumnBirthYears] = useState<Set<number>>(new Set());
  const [columnRoles, setColumnRoles] = useState<Set<string>>(new Set());
  const [columnGroups, setColumnGroups] = useState<Set<string>>(new Set());

  // Helper: Get standard tag from category
  const standardCategoryLabels: Record<GroupCategory, string> = {
    [GroupCategory.BARNKIRKE]: 'Barnekirke',
    [GroupCategory.FELLOWSHIP]: 'Husgrupper',
    [GroupCategory.SERVICE]: 'Teams',
    [GroupCategory.STRATEGY]: 'Ledelse'
  };
  const orderedStandardCategories: GroupCategory[] = [
    GroupCategory.BARNKIRKE,
    GroupCategory.FELLOWSHIP,
    GroupCategory.SERVICE,
    GroupCategory.STRATEGY
  ];

  const isStandardCategoryValue = (value: string): value is GroupCategory => (
    Object.values(GroupCategory).includes(value as GroupCategory)
  );

  const getCategoryTag = (category: GroupCategoryValue): string => {
    if (isStandardCategoryValue(category)) {
      return standardCategoryLabels[category];
    }
    return category || '';
  };

  const getCategoryFromTag = (tag: string): GroupCategory | null => {
    switch (tag) {
      case 'Barnekirke': return GroupCategory.BARNKIRKE;
      case 'Husgrupper': return GroupCategory.FELLOWSHIP;
      case 'Teams': return GroupCategory.SERVICE;
      case 'Ledelse': return GroupCategory.STRATEGY;
      default: return null;
    }
  };

  // Helper: Get all tags for a group (standard + custom)
  const getGroupTags = (group: Group): string[] => {
    const standardTag = getCategoryTag(group.category);
    const customTags = group.tags || [];
    const tagSet = new Set([standardTag, ...customTags].filter(Boolean));
    return Array.from(tagSet);
  };

  const customGroupTags = db.groupTags || [];

  // Get all unique tags across all groups
  const allGroupTags = useMemo(() => {
    const tagSet = new Set<string>();
    db.groups.forEach(g => {
      getGroupTags(g).forEach(tag => tagSet.add(tag));
    });
    customGroupTags.forEach(tag => tagSet.add(tag));
    return Array.from(tagSet).sort();
  }, [db.groups, customGroupTags]);

  // Get tag counts
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = { 'Alle': db.groups.length };
    db.groups.forEach(g => {
      getGroupTags(g).forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    customGroupTags.forEach(tag => {
      if (counts[tag] === undefined) counts[tag] = 0;
    });
    return counts;
  }, [db.groups, customGroupTags]);

  const getDefaultNewGroupCategory = () => {
    const selectedTags = Array.from(selectedGroupTags).filter(tag => tag !== 'Alle');
    if (selectedTags.length !== 1) return '';
    return getCategoryFromTag(selectedTags[0]) || selectedTags[0];
  };

  const handleAddCustomTag = () => {
    const trimmed = newCustomTag.trim();
    if (!trimmed) return;
    const reserved = ['Alle', 'Barnekirke', 'Husgrupper', 'Teams', 'Ledelse'];
    if (reserved.includes(trimmed)) {
      alert('Denne kategorien finnes allerede som standard.');
      return;
    }
    if (customGroupTags.includes(trimmed)) {
      alert('Denne kategorien finnes allerede.');
      return;
    }
    setDb(prev => ({
      ...prev,
      groupTags: [...(prev.groupTags || []), trimmed]
    }));
    setSelectedGroupTags(new Set([trimmed]));
    setNewCustomTag('');
    setIsAddingCustomTag(false);
  };

  const handleDeleteCustomTag = (tag: string) => {
    const usedByGroups = db.groups.some(group => (group.tags || []).includes(tag));
    if (usedByGroups) {
      alert('Denne kategorien er i bruk. Slett grupper som bruker kategorien før du fjerner den.');
      return;
    }
    setDb(prev => ({
      ...prev,
      groupTags: (prev.groupTags || []).filter(t => t !== tag)
    }));
    if (selectedGroupTags.has(tag)) {
      const next = new Set(selectedGroupTags);
      next.delete(tag);
      if (next.size === 0) next.add('Alle');
      setSelectedGroupTags(next);
    }
  };

  const filteredGroups = useMemo(() => {
    let groups = db.groups;
    
    // Scoped Access: Hvis brukeren ikke er admin, vis kun grupper de leder
    if (!isAdmin && userLeaderGroups.length > 0) {
      groups = groups.filter(g => userLeaderGroups.includes(g.id));
    }

    // Filter by search
    if (memberSearch) {
      groups = groups.filter(g => 
        g.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        g.description?.toLowerCase().includes(memberSearch.toLowerCase())
      );
    }
    
    // Filter by selected tags (if not "Alle")
    if (!selectedGroupTags.has('Alle')) {
      groups = groups.filter(g => {
        const groupTags = getGroupTags(g);
        return Array.from(selectedGroupTags).some(selectedTag => groupTags.includes(selectedTag));
      });
    }
    
    return groups.sort((a, b) => a.name.localeCompare(b.name));
  }, [db.groups, memberSearch, selectedGroupTags, isAdmin, userLeaderGroups]);
  const managedGroup = db.groups.find(g => g.id === manageGroupId);
  const viewedGroup = db.groups.find(g => g.id === viewingGroupId);
  const viewedRole = db.serviceRoles.find(r => r.id === viewingRoleId);
  const selectedPerson = db.persons.find(p => p.id === selectedPersonId);

  useEffect(() => {
    if (!initialViewGroupId) return;
    setViewingGroupId(initialViewGroupId);
    const group = db.groups.find(g => g.id === initialViewGroupId);
    if (group) {
      setActiveTab('groups');
      // Pre-select the tag for this group's category
      const categoryTag = getCategoryTag(group.category);
      if (categoryTag) {
        setSelectedGroupTags(new Set([categoryTag]));
      }
    }
  }, [initialViewGroupId, db.groups]);

  // Nullstill selectedPersonId ved mount hvis initialPersonId ikke er satt
  useEffect(() => {
    if (!initialPersonId && selectedPersonId) {
      setSelectedPersonId(null);
    }
  }, []); // Kjør kun ved mount

  useEffect(() => {
    if (!isAdmin) return;
    if (initialPersonId) {
      setSelectedPersonId(initialPersonId);
      setActiveTab('persons');
    } else {
      // Nullstill selectedPersonId hvis initialPersonId ikke er satt
      // Dette sikrer at personkortet ikke åpnes automatisk når fanen byttes
      setSelectedPersonId(null);
    }
  }, [initialPersonId, isAdmin]);

  useEffect(() => {
    if (!isScopedLeader) return;
    // Scoped leaders should default to groups tab
    if (activeTab !== 'groups') {
      setActiveTab('groups');
    }
  }, [activeTab, isScopedLeader]);

  // Reset form state når "Legg til medlem"-modalen åpnes
  useEffect(() => {
    if (isAddMemberModalOpen) {
      setMemberPersonSearch('');
      setMemberPersonId(null);
      setMemberFamilyRole(FamilyRole.CHILD);
      setMemberIsSecondaryResidence(false);
      setIsNewPerson(false);
      setNewPersonEmail('');
      setNewPersonPhone('');
      setNewPersonBirthYear('');
      setNewPersonBirthDate('');
    }
  }, [isAddMemberModalOpen]);

  useEffect(() => {
    if (isCreatePersonModalOpen) {
      setNewPersonImageUrl('');
    }
  }, [isCreatePersonModalOpen]);

  useEffect(() => {
    if (editingPerson) {
      setEditingPersonImageUrl(editingPerson.imageUrl || '');
    } else {
      setEditingPersonImageUrl('');
    }
  }, [editingPerson]);

  const handleImageFileChange = (file: File, setter: (value: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setter(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (manageGroupId && !canManageGroup(manageGroupId)) {
      setManageGroupId(null);
      return;
    }
    if (manageGroupId) {
      const group = db.groups.find(g => g.id === manageGroupId);
      if (group) {
        setEditingGroupName(group.name);
        setEditingGroupCategory(group.category);
        setEditingGroupDescription(group.description || '');
        setEditingGroupLink(group.link || '');
        setEditingGroupColor(group.color || '#2563eb');
        if (group.gathering_pattern) {
          const normalizedPattern = {
            ...group.gathering_pattern,
            day_of_week: getDayOfWeek(group.gathering_pattern.start_date)
          };
          setTempPattern(normalizedPattern);
        } else {
          const startDate = new Date().toISOString().split('T')[0];
          setTempPattern({
            frequency_type: 'weeks',
            interval: 2,
            day_of_week: getDayOfWeek(startDate),
            start_date: startDate
          });
        }
      }
    } else {
      setEditingGroupName('');
      setEditingGroupCategory(GroupCategory.SERVICE);
      setEditingGroupDescription('');
      setEditingGroupLink('');
      setEditingGroupColor('#2563eb');
      setTempPattern(null);
    }
  }, [manageGroupId, db.groups, canManageGroup]);

  useEffect(() => {
    if (viewingFamilyId) {
      const family = db.families.find(f => f.id === viewingFamilyId);
      if (family) {
        setEditingFamilyStreetAddress(family.streetAddress || '');
        setEditingFamilyPostalCode(family.postalCode || '');
        setEditingFamilyCity(family.city || '');
      }
    }
  }, [viewingFamilyId, db.families]);

  useEffect(() => {
    if (!isGatheringPatternExpanded || !gatheringSectionRef.current) return;
    const handle = window.setTimeout(() => {
      gatheringSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
    return () => window.clearTimeout(handle);
  }, [isGatheringPatternExpanded]);

  const personData = useMemo(() => {
    if (!selectedPersonId) return null;

    const memberships = db.groupMembers
      .filter(gm => gm.person_id === selectedPersonId)
      .map(gm => {
        const group = db.groups.find(g => g.id === gm.group_id);
        const serviceRole = gm.service_role_id ? db.serviceRoles.find(sr => sr.id === gm.service_role_id) : null;
        return { gm, group, serviceRole };
      });

    // Hent assignments og programposter
    const allAssignments = db.assignments
      .filter(a => a.person_id === selectedPersonId && a.occurrence_id)
      .map(a => {
        const occ = db.eventOccurrences.find(o => o.id === a.occurrence_id);
        const role = db.serviceRoles.find(sr => sr.id === a.service_role_id);
        return { a, occ, role };
      })
      .filter(item => item.occ && new Date(item.occ.date) >= new Date(new Date().setHours(0,0,0,0)));

    // Hent programposter for å inkludere dem i visningen
    const programItems = db.programItems
      .filter(p => p.person_id === selectedPersonId && p.occurrence_id)
      .map(p => {
        const occ = db.eventOccurrences.find(o => o.id === p.occurrence_id);
        const role = p.service_role_id ? db.serviceRoles.find(sr => sr.id === p.service_role_id) : null;
        return { p, occ, role };
      })
      .filter(item => item.occ && new Date(item.occ.date) >= new Date(new Date().setHours(0,0,0,0)));

    // Grupper assignments per arrangement og rolle for å unngå duplikater
    // Hvis samme rolle finnes flere ganger i samme arrangement, vis den kun én gang
    const uniqueAssignmentsByOccurrenceAndRole = new Map<string, typeof allAssignments[0]>();
    
    allAssignments.forEach(item => {
      if (!item.occ || !item.role) return;
      // Lag en unik nøkkel basert på occurrence_id og service_role_id
      const key = `${item.occ.id}-${item.role.id}`;
      if (!uniqueAssignmentsByOccurrenceAndRole.has(key)) {
        uniqueAssignmentsByOccurrenceAndRole.set(key, item);
      }
    });

    // Legg til programposter som separate entries, men unngå duplikater hvis samme rolle allerede finnes
    const programItemsAsEntries = programItems
      .filter(({ occ, role }) => {
        if (!occ || !role) return false;
        // Inkluder kun hvis det ikke allerede finnes en assignment for samme occurrence og rolle
        const key = `${occ.id}-${role.id}`;
        return !uniqueAssignmentsByOccurrenceAndRole.has(key);
      })
      .map(({ occ, role, p }) => ({
        a: null as any, // Programpost, ikke assignment
        occ,
        role,
        programItem: p
      }));

    // Kombiner unike assignments med programposter (uten duplikater)
    const allUpcomingEntries = [
      ...Array.from(uniqueAssignmentsByOccurrenceAndRole.values()),
      ...programItemsAsEntries
    ].sort((a, b) => new Date(a.occ!.date).getTime() - new Date(b.occ!.date).getTime());

    return { memberships, upcomingAssignments: allUpcomingEntries };
  }, [selectedPersonId, db]);

  const getIcon = (cat: GroupCategoryValue) => {
    switch (cat) {
      case GroupCategory.BARNKIRKE: return <Baby className="text-slate-500" size={18} />;
      case GroupCategory.SERVICE: return <Shield className="text-slate-500" size={18} />;
      case GroupCategory.FELLOWSHIP: return <Heart className="text-slate-500" size={18} />;
      case GroupCategory.STRATEGY: return <Users className="text-slate-500" size={18} />;
      default: return <Tag className="text-slate-500" size={18} />;
    }
  };

  const getDayOfWeek = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).getDay();
  };

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

  const buildGroupOccurrences = (
    pattern: GatheringPattern,
    groupName: string,
    existingOccurrences: EventOccurrence[],
    existingTitles: string[],
    groupTags: string[],
    groupColor?: string
  ): EventOccurrence[] => {
    if (!groupName.trim()) return [];
    const titleCandidates = new Set(existingTitles.map(t => t.trim()).filter(Boolean));
    if (titleCandidates.size === 0) return [];

    const newOccurrences: EventOccurrence[] = [];
    let current = parseLocalDate(pattern.start_date);
    const endDate = pattern.end_date ? parseLocalDate(pattern.end_date) : null;
    let iterations = 0;

    while (true) {
      const dateStr = formatLocalDate(current);
      const exists = existingOccurrences.some(
        o => o.date === dateStr && o.title_override && titleCandidates.has(o.title_override)
      );
      if (!exists) {
        newOccurrences.push({
          id: crypto.randomUUID(),
          template_id: null,
          date: dateStr,
          time: pattern.time || undefined,
          end_time: pattern.end_time || undefined,
          title_override: groupName.trim(),
          tags: groupTags.length > 0 ? groupTags : undefined,
          color: groupColor || undefined,
          status: OccurrenceStatus.DRAFT
        });
      }

      iterations += 1;
      if (endDate) {
        if (current >= endDate) break;
      } else if (iterations >= syncCount) {
        break;
      }

      if (pattern.frequency_type === 'weeks') {
        current.setDate(current.getDate() + (pattern.interval * 7));
      } else {
        current.setMonth(current.getMonth() + pattern.interval);
      }
    }

    return newOccurrences;
  };

  const handleUpdateGatheringPattern = (updates: Partial<GatheringPattern>) => {
    if (!tempPattern || !manageGroupId) return;
    const nextUpdates = { ...updates };
    if (updates.start_date) {
      nextUpdates.day_of_week = getDayOfWeek(updates.start_date);
    }
    const newPattern = { ...tempPattern, ...nextUpdates };
    setTempPattern(newPattern);
    setDb(prev => ({
      ...prev,
      groups: prev.groups.map(g => g.id === manageGroupId ? { ...g, gathering_pattern: newPattern } : g)
    }));
  };

  const handleSyncToCalendar = (options?: {
    groupName?: string;
    pattern?: GatheringPattern;
    showAlert?: boolean;
    existingTitles?: string[];
    groupTags?: string[];
    groupColor?: string;
  }) => {
    const groupName = options?.groupName ?? managedGroup?.name ?? '';
    const pattern = options?.pattern ?? tempPattern;
    if (!pattern || !groupName.trim()) return;
    const titleCandidates = options?.existingTitles ?? [groupName, managedGroup?.name].filter(Boolean) as string[];
    const calendarTags = options?.groupTags ?? getGroupTags(managedGroup || { category: '', tags: [] } as Group);
    const calendarColor = options?.groupColor ?? managedGroup?.color;
    let newCount = 0;

    setDb(prev => {
      const newOccurrences = buildGroupOccurrences(pattern, groupName, prev.eventOccurrences, titleCandidates, calendarTags, calendarColor);
      newCount = newOccurrences.length;
      if (newOccurrences.length === 0) return prev;
      return { ...prev, eventOccurrences: [...prev.eventOccurrences, ...newOccurrences] };
    });

    if (options?.showAlert !== false && newCount > 0) {
      alert(`${newCount} samlinger lagt til i kalenderen.`);
    }
  };

  const handleUpdateMemberRole = (memberId: UUID, serviceRoleId: UUID | null) => {
    setDb(prev => {
      const targetMember = prev.groupMembers.find(gm => gm.id === memberId);
      if (!targetMember) return prev;
      const group = prev.groups.find(g => g.id === targetMember.group_id);
      const roleName = serviceRoleId ? prev.serviceRoles.find(r => r.id === serviceRoleId)?.name : 'ingen spesifikk rolle';

      const newMessage: NoticeMessage = {
        id: crypto.randomUUID(),
        sender_id: 'system',
        recipient_id: targetMember.person_id,
        title: 'Tjenesterolle oppdatert',
        content: `Din tjenesterolle i gruppen "${group?.name || 'Ukjent'}" er oppdatert til ${roleName}.`,
        created_at: new Date().toISOString(),
        isRead: false
      };

      return {
        ...prev,
        groupMembers: prev.groupMembers.map(gm => gm.id === memberId ? { ...gm, service_role_id: serviceRoleId } : gm),
        noticeMessages: [newMessage, ...prev.noticeMessages]
      };
    });
  };

  const handleToggleLeader = (memberId: UUID) => {
    setDb(prev => {
      const targetMember = prev.groupMembers.find(gm => gm.id === memberId);
      if (!targetMember) return prev;
      const personId = targetMember.person_id;
      const group = prev.groups.find(g => g.id === targetMember.group_id);
      const isNowLeader = targetMember.role !== GroupRole.LEADER;
      
      const nextGroupMembers = prev.groupMembers.map(gm => gm.id === memberId ? { ...gm, role: isNowLeader ? GroupRole.LEADER : GroupRole.MEMBER } : gm);
      const nextPersons = prev.persons.map(p => {
        if (p.id === personId) {
          if (p.core_role === CoreRole.ADMIN || p.core_role === CoreRole.PASTOR) return p;
          if (isNowLeader) return { ...p, core_role: CoreRole.TEAM_LEADER };
          const isLeaderElsewhere = nextGroupMembers.some(gm => gm.person_id === personId && gm.role === GroupRole.LEADER);
          return { ...p, core_role: isLeaderElsewhere ? CoreRole.TEAM_LEADER : CoreRole.MEMBER };
        }
        return p;
      });

      const newMessage: NoticeMessage = {
        id: crypto.randomUUID(),
        sender_id: 'system',
        recipient_id: personId,
        title: isNowLeader ? 'Du er nå gruppeleder' : 'Rolle endret i gruppe',
        content: isNowLeader 
          ? `Du har blitt utnevnt til gruppeleder for "${group?.name || 'Ukjent'}".`
          : `Din rolle i "${group?.name || 'Ukjent'}" er endret til medlem.`,
        created_at: new Date().toISOString(),
        isRead: false
      };

      return { 
        ...prev, 
        groupMembers: nextGroupMembers, 
        persons: nextPersons,
        noticeMessages: [newMessage, ...prev.noticeMessages]
      };
    });
  };

  const handleSetMemberRole = (memberId: UUID, role: GroupRole) => {
    setDb(prev => {
      const targetMember = prev.groupMembers.find(gm => gm.id === memberId);
      if (!targetMember) return prev;
      const personId = targetMember.person_id;
      const group = prev.groups.find(g => g.id === targetMember.group_id);
      
      const nextGroupMembers = prev.groupMembers.map(gm => gm.id === memberId ? { ...gm, role } : gm);
      
      // Oppdater core_role hvis personen blir leder
      const nextPersons = prev.persons.map(p => {
        if (p.id === personId) {
          if (p.core_role === CoreRole.ADMIN || p.core_role === CoreRole.PASTOR) return p;
          if (role === GroupRole.LEADER) return { ...p, core_role: CoreRole.TEAM_LEADER };
          const isLeaderElsewhere = nextGroupMembers.some(gm => gm.person_id === personId && gm.role === GroupRole.LEADER);
          return { ...p, core_role: isLeaderElsewhere ? CoreRole.TEAM_LEADER : CoreRole.MEMBER };
        }
        return p;
      });
      
      const roleLabel = role === GroupRole.LEADER ? 'Gruppeleder' : role === GroupRole.DEPUTY_LEADER ? 'Nestleder' : 'Medlem';
      const newMessage: NoticeMessage = {
        id: crypto.randomUUID(),
        sender_id: 'system',
        recipient_id: personId,
        title: 'Rolle endret i gruppe',
        content: `Din rolle i gruppen "${group?.name || 'Ukjent'}" er endret til ${roleLabel}.`,
        created_at: new Date().toISOString(),
        isRead: false
      };

      return { 
        ...prev, 
        groupMembers: nextGroupMembers, 
        persons: nextPersons,
        noticeMessages: [newMessage, ...prev.noticeMessages]
      };
    });
  };

  const handleAddMember = (personId: UUID) => {
    if (!manageGroupId) return;
    if (db.groupMembers.some(gm => gm.group_id === manageGroupId && gm.person_id === personId)) return;
    const group = db.groups.find(g => g.id === manageGroupId);
    const newMember: GroupMember = { id: crypto.randomUUID(), group_id: manageGroupId, person_id: personId, role: GroupRole.MEMBER };
    
    const newMessage: NoticeMessage = {
      id: crypto.randomUUID(),
      sender_id: 'system',
      recipient_id: personId,
      title: 'Lagt til i gruppe',
      content: `Du har blitt lagt til i gruppen "${group?.name || 'Ukjent'}".`,
      created_at: new Date().toISOString(),
      isRead: false
    };

    setDb(prev => ({ 
      ...prev, 
      groupMembers: [...prev.groupMembers, newMember],
      noticeMessages: [newMessage, ...prev.noticeMessages]
    }));
  };

  const handleRemoveMember = (memberId: UUID) => {
    setDb(prev => ({ ...prev, groupMembers: prev.groupMembers.filter(gm => gm.id !== memberId) }));
  };

  const handleUpdateGroupBasicInfo = (updates: Partial<Group>) => {
    if (!manageGroupId) return;
    setDb(prev => ({ ...prev, groups: prev.groups.map(g => g.id === manageGroupId ? { ...g, ...updates } : g) }));
  };

  const handleSaveGroupChanges = () => {
    if (!manageGroupId) return;
    
    const updates: Partial<Group> = {
      name: editingGroupName.trim(),
      category: editingGroupCategory,
      description: editingGroupDescription.trim() || undefined,
      link: editingGroupLink.trim() || undefined,
      color: editingGroupColor || undefined,
      gathering_pattern: tempPattern || undefined
    };
    
    handleUpdateGroupBasicInfo(updates);
    if (tempPattern && editingGroupName.trim()) {
      handleSyncToCalendar({
        groupName: editingGroupName.trim(),
        pattern: tempPattern,
        groupTags: getGroupTags(managedGroup || { category: '', tags: [] } as Group),
        groupColor: editingGroupColor || undefined,
        showAlert: false,
        existingTitles: [editingGroupName.trim(), managedGroup?.name].filter(Boolean) as string[]
      });
    }
    setManageGroupId(null);
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    if (!newGroupCategory) {
      alert('Velg kategori/tag for gruppen før du lagrer.');
      return;
    }
    
    const newGroupId = crypto.randomUUID();
    const gatheringPattern: GatheringPattern | undefined = newGroupFrequency > 0 ? {
      frequency_type: 'weeks',
      interval: newGroupFrequency,
      day_of_week: getDayOfWeek(newGroupStartDate),
      start_date: newGroupStartDate,
      end_date: newGroupEndDate || undefined,
      time: newGroupStartTime || undefined,
      end_time: newGroupEndTime || undefined
    } : undefined;
    
    const selectedTags = Array.from(selectedGroupTags).filter(tag => tag !== 'Alle');
    const categoryTag = getCategoryTag(newGroupCategory);
    const customTags = selectedTags.filter(tag => tag !== categoryTag);

    const newGroup: Group = {
      id: newGroupId,
      name: newGroupName.trim(),
      category: newGroupCategory,
      description: newGroupDescription.trim() || undefined,
      link: newGroupLink.trim() || undefined,
      color: newGroupColor || undefined,
      gathering_pattern: gatheringPattern,
      tags: customTags.length > 0 ? customTags : undefined
    };
    
    setDb(prev => {
      const newGroupMembers: GroupMember[] = [];
      const newNotices: NoticeMessage[] = [];
      
      // Legg til leder hvis valgt
      if (newGroupLeaderId) {
        newGroupMembers.push({
          id: crypto.randomUUID(),
          group_id: newGroupId,
          person_id: newGroupLeaderId,
          role: GroupRole.LEADER
        });

        newNotices.push({
          id: crypto.randomUUID(),
          sender_id: 'system',
          recipient_id: newGroupLeaderId,
          title: 'Lagt til i ny gruppe',
          content: `Du har blitt lagt til som leder i den nye gruppen "${newGroupName.trim()}".`,
          created_at: new Date().toISOString(),
          isRead: false
        });
      }
      
      // Legg til medlemmer (unngå duplikat av leder)
      newGroupMemberIds.forEach(personId => {
        if (personId !== newGroupLeaderId) {
          newGroupMembers.push({
            id: crypto.randomUUID(),
            group_id: newGroupId,
            person_id: personId,
            role: GroupRole.MEMBER
          });

          newNotices.push({
            id: crypto.randomUUID(),
            sender_id: 'system',
            recipient_id: personId,
            title: 'Lagt til i ny gruppe',
            content: `Du har blitt lagt til i den nye gruppen "${newGroupName.trim()}".`,
            created_at: new Date().toISOString(),
            isRead: false
          });
        }
      });
      
      const nextState = { 
        ...prev, 
        groups: [...prev.groups, newGroup], 
        groupMembers: [...prev.groupMembers, ...newGroupMembers],
        noticeMessages: [...newNotices, ...prev.noticeMessages] 
      };

      if (gatheringPattern && newGroupName.trim()) {
        const newOccurrences = buildGroupOccurrences(
          gatheringPattern,
          newGroupName.trim(),
          prev.eventOccurrences,
          [newGroupName.trim()],
          getGroupTags(newGroup),
          newGroup.color
        );
        if (newOccurrences.length > 0) {
          nextState.eventOccurrences = [...prev.eventOccurrences, ...newOccurrences];
        }
      }

      return nextState;
    });

    setActiveTab('groups');
    setSelectedGroupTags(new Set([categoryTag]));
    
    // Reset form
    setNewGroupName('');
    setNewGroupDescription('');
    setNewGroupLink('');
    setNewGroupLeaderId(null);
    setNewGroupMemberIds([]);
    setNewGroupMemberSearch('');
    setNewGroupDayOfWeek(0);
    setNewGroupFrequency(1);
    setNewGroupStartDate(new Date().toISOString().split('T')[0]);
    setNewGroupStartTime('');
    setNewGroupEndTime('');
    setNewGroupEndDate('');
    setNewGroupColor('#2563eb');
    setNewGroupCategory('');
    setIsCreateModalOpen(false);
  };

  const handleDeleteGroup = (groupId: UUID) => {
    if (!confirm('Er du sikker på at du vil slette denne gruppen?')) return;
    
    setDb(prev => ({
      ...prev,
      groups: prev.groups.filter(g => g.id !== groupId),
      groupMembers: prev.groupMembers.filter(gm => gm.group_id !== groupId)
    }));
    
    setIsDeletingGroup(null);
    if (viewingGroupId === groupId) setViewingGroupId(null);
    if (manageGroupId === groupId) setManageGroupId(null);
  };

  const handleCreatePerson = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const isAdminOverride = formData.get('is_admin') === 'true';
    const email = (formData.get('email') as string)?.trim() || undefined;
    const phone = (formData.get('phone') as string)?.trim() || undefined;
    const imageUrlValue = newPersonImageUrl.trim() || undefined;
    const birthDate = (formData.get('birth_date') as string)?.trim() || undefined;
    const streetAddress = (formData.get('streetAddress') as string)?.trim() || undefined;
    const postalCode = (formData.get('postalCode') as string)?.trim() || undefined;
    const city = (formData.get('city') as string)?.trim() || undefined;
    const newPerson: Person = { 
      id: crypto.randomUUID(), 
      name: (formData.get('name') as string).trim(), 
      email, 
      phone, 
      imageUrl: imageUrlValue,
      birth_date: birthDate,
      streetAddress,
      postalCode,
      city,
      is_admin: isAdminOverride, 
      is_active: true, 
      core_role: CoreRole.MEMBER 
    };
    setDb(prev => ({ ...prev, persons: [...prev.persons, newPerson] }));
    if (imageUrlValue) {
      saveImageLibraryEntry(newPerson.id, imageUrlValue);
    }
    setIsCreatePersonModalOpen(false);
  };

  const handleUpdatePerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerson) return;
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const isAdminOverride = formData.get('is_admin') === 'true';
    const email = (formData.get('email') as string)?.trim() || undefined;
    const phone = (formData.get('phone') as string)?.trim() || undefined;
    const imageUrlValue = editingPersonImageUrl.trim() || undefined;
    const birthDate = (formData.get('birth_date') as string)?.trim() || undefined;
    const streetAddress = (formData.get('streetAddress') as string)?.trim() || undefined;
    const postalCode = (formData.get('postalCode') as string)?.trim() || undefined;
    const city = (formData.get('city') as string)?.trim() || undefined;
    const updatedPerson: Person = { 
      ...editingPerson, 
      name: (formData.get('name') as string).trim(), 
      email, 
      phone, 
      imageUrl: imageUrlValue,
      birth_date: birthDate,
      streetAddress,
      postalCode,
      city,
      is_admin: isAdminOverride
    };
    setDb(prev => ({ ...prev, persons: prev.persons.map(p => p.id === editingPerson.id ? updatedPerson : p) }));
    if (imageUrlValue) {
      saveImageLibraryEntry(editingPerson.id, imageUrlValue);
    } else {
      removeImageLibraryEntry(editingPerson.id);
    }
    setEditingPerson(null);
  };

  const handleDeletePerson = (id: UUID) => {
    if (!confirm('Er du sikker på at du vil slette denne personen?')) return;
    setDb(prev => ({ ...prev, persons: prev.persons.filter(p => p.id !== id), groupMembers: prev.groupMembers.filter(gm => gm.person_id !== id), assignments: prev.assignments.map(a => a.person_id === id ? { ...a, person_id: null } : a), programItems: prev.programItems.map(p => p.person_id === id ? { ...p, person_id: null } : p) }));
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamilyName.trim()) return;

    try {
      console.log('Prøver å opprette familie:', newFamilyName.trim());
      const response = await fetch('/api/families', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFamilyName.trim(),
        }),
      });

      console.log('Response status:', response.status, response.statusText);
      let newFamily: Family;

      if (!response.ok) {
        // Hvis API ikke er tilgjengelig, bruk localStorage fallback
        const errorText = await response.text().catch(() => 'Ukjent feil');
        console.warn('API-kall feilet (status:', response.status, '), bruker localStorage fallback. Feilmelding:', errorText);
        alert('⚠️ Kunne ikke koble til server. Familien lagres lokalt i nettleseren.');
        
        // Fallback: Opprett familie lokalt
        newFamily = {
          id: crypto.randomUUID(),
          name: newFamilyName.trim(),
          created_at: new Date().toISOString()
        };
      } else {
        newFamily = await response.json();
        console.log('✅ Familie opprettet i databasen');
      }
      
      // Oppdater lokal state (fungerer både for API og localStorage)
      setDb(prev => ({
        ...prev,
        families: [...(prev.families || []), newFamily]
      }));

      setNewFamilyName('');
      setIsCreateFamilyModalOpen(false);
      
      // Åpne modal for å legge til første medlem
      setNewlyCreatedFamilyId(newFamily.id);
      setSelectedFamilyForMember(newFamily.id);
      setIsAddMemberModalOpen(true);
    } catch (error) {
      console.error('Feil ved opprettelse av familie:', error);
      alert('⚠️ Nettverksfeil. Familien lagres lokalt i nettleseren.');
      
      // Fallback: Opprett familie lokalt hvis fetch feiler helt (f.eks. nettverkfeil)
      const newFamily: Family = {
        id: crypto.randomUUID(),
        name: newFamilyName.trim(),
        created_at: new Date().toISOString()
      };
      
      setDb(prev => ({
        ...prev,
        families: [...(prev.families || []), newFamily]
      }));

      setNewFamilyName('');
      setIsCreateFamilyModalOpen(false);
      
      setNewlyCreatedFamilyId(newFamily.id);
      setSelectedFamilyForMember(newFamily.id);
      setIsAddMemberModalOpen(true);
      
      alert('Familie opprettet lokalt (API ikke tilgjengelig). Data lagres i nettleseren.');
    }
  };

  const handleAddFamilyMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFamilyForMember || (!memberPersonId && !isNewPerson)) return;
    if (!memberPersonSearch.trim()) return;

    let finalPersonId: UUID | null = memberPersonId;

    // Hvis personen ikke eksisterer, opprett den først
    if (isNewPerson && !memberPersonId) {
      try {
        // Først: Opprett personen i personbasen
        console.log('Oppretter ny person:', memberPersonSearch.trim());
        const personResponse = await fetch('/api/people', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: memberPersonSearch.trim(),
            email: newPersonEmail.trim() || undefined,
            phone: newPersonPhone.trim() || undefined,
            birth_date: newPersonBirthDate || undefined,
            is_admin: false,
            is_active: true,
            core_role: CoreRole.MEMBER,
          }),
        });

        let newPerson: Person;

        if (!personResponse.ok) {
          // Fallback: Opprett person lokalt
          console.warn('API-kall feilet ved opprettelse av person, bruker localStorage fallback');
          alert('⚠️ Kunne ikke koble til server. Personen lagres lokalt i nettleseren.');
          newPerson = {
            id: crypto.randomUUID(),
            name: memberPersonSearch.trim(),
            email: newPersonEmail.trim() || undefined,
            phone: newPersonPhone.trim() || undefined,
            birth_date: newPersonBirthDate || undefined,
            is_admin: false,
            is_active: true,
            core_role: CoreRole.MEMBER,
          };
        } else {
          newPerson = await personResponse.json();
          console.log('✅ Person opprettet i databasen');
        }

        // Oppdater lokal state med ny person
        setDb(prev => ({
          ...prev,
          persons: [...prev.persons, newPerson]
        }));

        finalPersonId = newPerson.id;
        console.log('Ny person opprettet med ID:', finalPersonId);
      } catch (error) {
        console.error('Feil ved opprettelse av person:', error);
        alert('⚠️ Nettverksfeil. Personen lagres lokalt i nettleseren.');
        
        // Fallback: Opprett person lokalt
        const newPerson: Person = {
          id: crypto.randomUUID(),
          name: memberPersonSearch.trim(),
          email: newPersonEmail.trim() || undefined,
          phone: newPersonPhone.trim() || undefined,
          birth_date: newPersonBirthDate || undefined,
          is_admin: false,
          is_active: true,
          core_role: CoreRole.MEMBER,
        };

        setDb(prev => ({
          ...prev,
          persons: [...prev.persons, newPerson]
        }));

        finalPersonId = newPerson.id;
      }
    }

    if (!finalPersonId) {
      alert('Kunne ikke opprette eller finne person.');
      return;
    }

    // Validering: Sjekk om personen allerede er medlem i 2 familier
    const existingFamilyMemberships = (db.familyMembers || []).filter(fm => fm.person_id === finalPersonId);
    if (existingFamilyMemberships.length >= 2) {
      alert('Denne personen er allerede medlem i 2 familier. Maksimalt antall familier per person er 2.');
      return;
    }

    // Hvis vi prøver å sette til primæradresse (checkbox ikke huket av), må vi sjekke at personen ikke har en annen primæradresse
    const isPrimaryResidence = !memberIsSecondaryResidence;
    if (isPrimaryResidence) {
      const hasOtherPrimary = existingFamilyMemberships.some(fm => fm.isPrimaryResidence);
      if (hasOtherPrimary) {
        alert('Denne personen har allerede en primæradresse i en annen familie. Kun én primæradresse tillatt.');
        return;
      }
    }

    try {
      // Deretter: Koble personen til familien
      const response = await fetch('/api/families/' + selectedFamilyForMember + '/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          person_id: finalPersonId,
          role: memberFamilyRole,
          isPrimaryResidence: !memberIsSecondaryResidence,
        }),
      });

      let newMember: FamilyMember;

      if (!response.ok) {
        // Fallback: Opprett medlem lokalt
        console.warn('API-kall feilet, bruker localStorage fallback');
        alert('⚠️ Kunne ikke koble til server. Medlemskapet lagres lokalt i nettleseren.');
        newMember = {
          id: crypto.randomUUID(),
          family_id: selectedFamilyForMember,
          person_id: finalPersonId,
          role: memberFamilyRole,
          isPrimaryResidence: !memberIsSecondaryResidence
        };
      } else {
        newMember = await response.json();
        console.log('✅ Medlem lagt til i databasen');
      }
      
      // Oppdater lokal state (fungerer både for API og localStorage)
      setDb(prev => ({
        ...prev,
        familyMembers: [...(prev.familyMembers || []), newMember]
      }));

      // Reset form
      setMemberPersonId(null);
      setMemberPersonSearch('');
      setMemberFamilyRole(FamilyRole.CHILD);
      setMemberIsSecondaryResidence(false);
      setNewlyCreatedFamilyId(null);
      setIsNewPerson(false);
      setNewPersonEmail('');
      setNewPersonPhone('');
      setNewPersonBirthYear('');
      setNewPersonBirthDate('');
      setIsAddMemberModalOpen(false);
    } catch (error) {
      console.error('Feil ved legg-til medlem:', error);
      alert('⚠️ Nettverksfeil. Medlemskapet lagres lokalt i nettleseren.');
      
      // Fallback: Opprett medlem lokalt
      const newMember: FamilyMember = {
        id: crypto.randomUUID(),
        family_id: selectedFamilyForMember,
        person_id: finalPersonId!,
        role: memberFamilyRole,
        isPrimaryResidence: !memberIsSecondaryResidence
      };
      
      setDb(prev => ({
        ...prev,
        familyMembers: [...(prev.familyMembers || []), newMember]
      }));

      setMemberPersonId(null);
      setMemberPersonSearch('');
      setMemberFamilyRole(FamilyRole.CHILD);
      setMemberIsSecondaryResidence(false);
      setNewlyCreatedFamilyId(null);
      setIsNewPerson(false);
      setNewPersonEmail('');
      setNewPersonPhone('');
      setNewPersonBirthYear('');
      setNewPersonBirthDate('');
      setIsAddMemberModalOpen(false);
      
      alert('Familiemedlem lagt til lokalt (API ikke tilgjengelig). Data lagres i nettleseren.');
    }
  };

  const handleUpdateFamilyAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingFamilyId) return;

    try {
      const response = await fetch(`/api/families/${viewingFamilyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streetAddress: editingFamilyStreetAddress.trim() || undefined,
          postalCode: editingFamilyPostalCode.trim() || undefined,
          city: editingFamilyCity.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Ukjent feil');
        console.warn('API-kall feilet ved oppdatering av adresse, bruker localStorage fallback');
        alert('⚠️ Kunne ikke koble til server. Adressen lagres lokalt i nettleseren.');
        throw new Error('Kunne ikke oppdatere adresse');
      }

      const updatedFamily: Family = await response.json();
      console.log('✅ Adresse oppdatert i databasen');
      
      // Oppdater lokal state
      setDb(prev => ({
        ...prev,
        families: prev.families.map(f => f.id === viewingFamilyId ? updatedFamily : f)
      }));

      setIsEditingFamilyAddress(false);
    } catch (error) {
      console.error('Feil ved oppdatering av adresse:', error);
      if (error instanceof Error && error.message !== 'Kunne ikke oppdatere adresse') {
        alert('⚠️ Nettverksfeil. Adressen lagres lokalt i nettleseren.');
      }
      
      // Fallback: Oppdater lokalt
      setDb(prev => ({
        ...prev,
        families: prev.families.map(f => f.id === viewingFamilyId ? {
          ...f,
          streetAddress: editingFamilyStreetAddress.trim() || undefined,
          postalCode: editingFamilyPostalCode.trim() || undefined,
          city: editingFamilyCity.trim() || undefined,
        } : f)
      }));

      setIsEditingFamilyAddress(false);
    }
  };

  const handleUpdateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFamily) return;

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const name = (formData.get('name') as string)?.trim() || '';

    try {
      const response = await fetch(`/api/families/${editingFamily.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name || undefined,
        }),
      });

      if (!response.ok) {
        console.warn('API-kall feilet ved oppdatering av familie, bruker localStorage fallback');
        alert('⚠️ Kunne ikke koble til server. Familien lagres lokalt i nettleseren.');
        throw new Error('Kunne ikke oppdatere familie');
      }

      const updatedFamily: Family = await response.json();
      console.log('✅ Familie oppdatert i databasen');
      
      setDb(prev => ({
        ...prev,
        families: prev.families.map(f => f.id === editingFamily.id ? updatedFamily : f)
      }));

      setEditingFamily(null);
    } catch (error) {
      console.error('Feil ved oppdatering av familie:', error);
      if (error instanceof Error && error.message !== 'Kunne ikke oppdatere familie') {
        alert('⚠️ Nettverksfeil. Familien lagres lokalt i nettleseren.');
      }
      
      setDb(prev => ({
        ...prev,
        families: prev.families.map(f => f.id === editingFamily.id ? {
          ...f,
          name: name || f.name,
        } : f)
      }));

      setEditingFamily(null);
    }
  };

  // Hjelpefunksjon for å beregne alder
  const calculateAge = (birthDate?: string): string => {
    if (birthDate) {
      const birth = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return `${age} år`;
    }
    return '';
  };

  // Hjelpefunksjon for å bestemme kjønn basert på navn (norske navn)
  const getGenderFromName = (name: string): 'male' | 'female' => {
    const firstName = name.trim().split(/\s+/)[0].toLowerCase();
    
    // Vanlige norske jentenavn
    const femaleNames = [
      'anne', 'marie', 'kari', 'lise', 'ingrid', 'tone', 'siri', 'elin', 'sara', 'sofie',
      'emma', 'nora', 'ida', 'maja', 'ella', 'sophia', 'alma', 'frida', 'astrid', 'liv',
      'thea', 'ingrid', 'helen', 'kristin', 'camilla', 'hanna', 'marte', 'silje', 'mari',
      'vilde', 'mille', 'tiril', 'benny', 'beate', 'vigdis', 'lille-lise'
    ];
    
    // Vanlige norske guttenavn
    const maleNames = [
      'anders', 'lars', 'per', 'tom', 'morten', 'petter', 'andreas', 'thomas', 'magnar',
      'erik', 'ole', 'kristian', 'martin', 'daniel', 'henrik', 'johan', 'simon', 'lukas',
      'marius', 'mats', 'tobias', 'teodor', 'bjørn', 'bjørne', 'bjarne'
    ];
    
    if (femaleNames.some(n => firstName.startsWith(n) || firstName.includes(n))) {
      return 'female';
    }
    if (maleNames.some(n => firstName.startsWith(n) || firstName.includes(n))) {
      return 'male';
    }
    
    // Fallback: hvis navnet slutter på -a, -e, eller -ine, anta kvinne
    if (firstName.endsWith('a') || firstName.endsWith('e') || firstName.endsWith('ine')) {
      return 'female';
    }
    
    // Standard fallback til mann
    return 'male';
  };

  // Hjelpefunksjon for å beregne alder som tall
  const getPersonAge = (person: Person): number | null => {
    if (person.birth_date) {
      const birthDate = new Date(person.birth_date);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    }
    return null;
  };

  // Hjelpefunksjon for å generere avatar URL
  const getAvatarUrl = (person: Person): string => {
    if (person.imageUrl) return person.imageUrl;
    const gender = getGenderFromName(person.name);
    const age = getPersonAge(person);
    const seed = encodeURIComponent(person.name);
    
    // Bruk DiceBear API v7 - start med enkel base URL
    const baseUrl = 'https://api.dicebear.com/7.x/avataaars/svg';
    
    // Bygg parametere basert på kjønn og alder
    let topType = '';
    let accessoriesType = '';
    let hairColor = '';
    
    // Kjønn-basert styling
    if (gender === 'female') {
      // Jente/kvinne: langt hår
      if (age !== null && age < 12) {
        topType = 'longHairBob';
      } else {
        topType = 'longHairStraight';
      }
    } else {
      // Gutt/mann: kort hår
      if (age !== null && age < 12) {
        topType = 'shortHairShortRound';
      } else {
        topType = 'shortHairShortFlat';
      }
    }
    
    // Alder-basert styling
    if (age !== null) {
      if (age < 12) {
        // Barn: runde briller
        accessoriesType = 'Round';
      } else if (age > 60) {
        // Eldre: grått hår
        hairColor = 'SilverGray';
      }
    }
    
    // Bygg URL med parametere
    const params: string[] = [`seed=${seed}`];
    if (topType) params.push(`top=${topType}`);
    if (accessoriesType) params.push(`accessoriesType=${accessoriesType}`);
    if (hairColor) params.push(`hairColor=${hairColor}`);
    params.push('facialHairType=Blank');
    params.push('clotheType=ShirtVNeck');
    params.push(`clotheColor=${gender === 'female' ? 'Pink' : 'Blue03'}`);
    params.push('skinColor=Light');
    params.push('mouthType=Smile');
    params.push('eyeType=Happy');
    
    return `${baseUrl}?${params.join('&')}`;
  };

  // Hjelpefunksjon for å dele navn i fornavn og etternavn
  const splitName = (fullName: string): { firstName: string; lastName: string } => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    }
    const lastName = parts[parts.length - 1];
    const firstName = parts.slice(0, -1).join(' ');
    return { firstName, lastName };
  };

  const handleUpdateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingRoleId) return;
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    setDb(prev => ({
      ...prev,
      serviceRoles: prev.serviceRoles.map(r => r.id === viewingRoleId ? {
        ...r,
        name: formData.get('name') as string,
        default_instructions: (formData.get('instructions') as string).split('\n').filter(t => t.trim())
      } : r)
    }));
    setViewingRoleId(null);
  };

  const handleCreateServiceRole = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const newRole: ServiceRole = { id: crypto.randomUUID(), name: formData.get('name') as string, description: '', default_instructions: (formData.get('instructions') as string).split('\n').filter(t => t.trim()), is_active: true };
    setDb(prev => ({ ...prev, serviceRoles: [...prev.serviceRoles, newRole] }));
    setIsCreateServiceRoleModalOpen(false);
  };

  const getCoreRoleLabel = (role: CoreRole) => {
    switch (role) {
      case CoreRole.ADMIN: return 'Administrator';
      case CoreRole.PASTOR: return 'Pastor';
      case CoreRole.TEAM_LEADER: return 'Leder';
      case CoreRole.MEMBER: return 'Medlem';
      default: return 'Gjest';
    }
  };

  const getCoreRoleColor = (role: CoreRole) => {
    switch (role) {
      case CoreRole.PASTOR: return 'bg-purple-50 text-purple-700 border-purple-100';
      case CoreRole.TEAM_LEADER: return 'bg-blue-50 text-blue-700 border-blue-100';
      case CoreRole.ADMIN: return 'bg-primary-light text-primary border-primary-light';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Hjelpefunksjon for å beregne faktisk rolle for en person (samme logikk som i tabellen)
  const getPersonRole = useCallback((person: Person): 'Administrator' | 'Gruppeleder' | 'Nestleder' | 'Medlem' => {
    if (person.is_admin) return 'Administrator';
    const groupMemberships = db.groupMembers.filter(gm => gm.person_id === person.id);
    const isGroupLeader = groupMemberships.some(gm => gm.role === GroupRole.LEADER);
    const isDeputyLeader = groupMemberships.some(gm => gm.role === GroupRole.DEPUTY_LEADER);
    if (isGroupLeader) return 'Gruppeleder';
    if (isDeputyLeader) return 'Nestleder';
    return 'Medlem';
  }, [db.groupMembers]);

  // Hent alle unike fødselsår
  const availableBirthYears = useMemo(() => {
    const years = new Set<number>();
    db.persons.forEach(p => {
      if (p.birth_date) {
        const year = new Date(p.birth_date).getFullYear();
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a); // Sortert synkende (nyeste først)
  }, [db.persons]);

  // Hent alle unike roller som faktisk finnes i tabellen
  const availableRoles = useMemo(() => {
    const roles = new Set<'Administrator' | 'Gruppeleder' | 'Nestleder' | 'Medlem'>();
    db.persons.forEach(p => {
      roles.add(getPersonRole(p));
    });
    return Array.from(roles).sort((a, b) => {
      // Sorter: Administrator, Gruppeleder, Nestleder, Medlem
      const order: Record<string, number> = {
        'Administrator': 1,
        'Gruppeleder': 2,
        'Nestleder': 3,
        'Medlem': 4
      };
      return (order[a] || 99) - (order[b] || 99);
    });
  }, [db.persons, getPersonRole]);

  const availableGroups = useMemo(() => {
    return [...db.groups].sort((a, b) => a.name.localeCompare(b.name));
  }, [db.groups]);

  const filteredPersons = useMemo(() => {
    // Scoped Access: Hvis brukeren ikke er admin, vis kun medlemmer fra gruppene de leder
    let accessiblePersonIds: Set<UUID> | null = null;
    if (!isAdmin && currentUserId && userLeaderGroups.length > 0) {
      // Finn alle person-IDer som er medlemmer i brukerens grupper
      accessiblePersonIds = new Set(
        db.groupMembers
          .filter(gm => userLeaderGroups.includes(gm.group_id))
          .map(gm => gm.person_id)
      );
    }
    
    let filtered = db.persons.filter(p => {
      // Scoped Access: Hvis ikke admin, vis kun medlemmer fra egne grupper
      if (accessiblePersonIds && !accessiblePersonIds.has(p.id)) {
        return false;
      }
      
      const matchesSearch = p.name.toLowerCase().includes(personSearch.toLowerCase()) ||
                           (p.email && p.email.toLowerCase().includes(personSearch.toLowerCase())) ||
                           (p.phone && p.phone.includes(personSearch));
      
      // Kolonnefilter: Født (årstall)
      let matchesColumnBirthYear = true;
      if (columnBirthYears.size > 0) {
        if (p.birth_date) {
          const birthYear = new Date(p.birth_date).getFullYear();
          matchesColumnBirthYear = columnBirthYears.has(birthYear);
        } else {
          matchesColumnBirthYear = false;
        }
      }

      // Kolonnefilter: Rolle
      let matchesColumnRole = true;
      if (columnRoles.size > 0) {
        matchesColumnRole = columnRoles.has(getPersonRole(p));
      }

      // Kolonnefilter: Grupper
      let matchesColumnGroup = true;
      if (columnGroups.size > 0) {
        const personGroupIds = db.groupMembers.filter(gm => gm.person_id === p.id).map(gm => gm.group_id);
        matchesColumnGroup = personGroupIds.some(id => columnGroups.has(id));
      }
      
      return matchesSearch && matchesColumnBirthYear && matchesColumnRole && matchesColumnGroup;
    });

    // Sortering
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let comparison = 0;
        
        switch (sortColumn) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'role':
            // Sjekk rolle (admin > gruppeleder > nestleder > medlem)
            const aIsAdmin = a.is_admin;
            const bIsAdmin = b.is_admin;
            const aGroupMemberships = db.groupMembers.filter(gm => gm.person_id === a.id);
            const bGroupMemberships = db.groupMembers.filter(gm => gm.person_id === b.id);
            const aIsLeader = aGroupMemberships.some(gm => gm.role === GroupRole.LEADER);
            const bIsLeader = bGroupMemberships.some(gm => gm.role === GroupRole.LEADER);
            const aIsDeputy = aGroupMemberships.some(gm => gm.role === GroupRole.DEPUTY_LEADER);
            const bIsDeputy = bGroupMemberships.some(gm => gm.role === GroupRole.DEPUTY_LEADER);
            
            const aRoleValue = aIsAdmin ? 4 : (aIsLeader ? 3 : (aIsDeputy ? 2 : 1));
            const bRoleValue = bIsAdmin ? 4 : (bIsLeader ? 3 : (bIsDeputy ? 2 : 1));
            comparison = aRoleValue - bRoleValue;
            break;
          case 'birthDate':
            const aDate = a.birth_date ? new Date(a.birth_date).getTime() : 0;
            const bDate = b.birth_date ? new Date(b.birth_date).getTime() : 0;
            comparison = aDate - bDate;
            break;
          case 'groups':
            const aGroupNames = db.groupMembers
              .filter(gm => gm.person_id === a.id)
              .map(gm => db.groups.find(g => g.id === gm.group_id)?.name)
              .filter(Boolean)
              .join(', ');
            const bGroupNames = db.groupMembers
              .filter(gm => gm.person_id === b.id)
              .map(gm => db.groups.find(g => g.id === gm.group_id)?.name)
              .filter(Boolean)
              .join(', ');
            comparison = aGroupNames.localeCompare(bGroupNames);
            break;
          case 'address':
            const aAddr = `${a.streetAddress || ''} ${a.postalCode || ''} ${a.city || ''}`.trim();
            const bAddr = `${b.streetAddress || ''} ${b.postalCode || ''} ${b.city || ''}`.trim();
            comparison = aAddr.localeCompare(bAddr);
            break;
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    } else {
      // Standard sortering på navn hvis ingen sortering er valgt
      filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return filtered;
  }, [db.persons, db.groupMembers, personSearch, columnBirthYears, columnRoles, columnGroups, sortColumn, sortDirection, getPersonRole]);
  
  const filteredRoles = db.serviceRoles.filter(sr => sr.name.toLowerCase().includes(roleSearch.toLowerCase())).sort((a,b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-20 md:pb-8 animate-in fade-in duration-300 text-left">
      {/* Precision Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{isScopedLeader ? 'Mine grupper' : 'Folk'}</h2>
          <p className="text-sm text-slate-500">{isScopedLeader ? 'Oversikt over grupper du leder eller er nestleder for.' : 'Administrasjon av personer, grupper og roller.'}</p>
        </div>
        <div className="inline-flex bg-slate-200/60 p-1 rounded-theme flex-wrap gap-1">
          {(isScopedLeader
            ? (['groups'] as const)
            : (['persons', 'groups', 'roles'] as const)
          ).map(tab => (
            <button 
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedPersonId(null); }} 
              className={`px-4 py-1.5 rounded-theme text-xs font-semibold transition-all ${activeTab === tab && !selectedPersonId ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              {tab === 'persons' ? 'Personer' : tab === 'groups' ? 'Grupper' : 'Roller'}
            </button>
          ))}
        </div>
      </div>

      {activeTab !== 'persons' && activeTab !== 'roles' && (
        <div className="flex justify-between items-center bg-white p-3 rounded-theme border border-slate-200 shadow-sm">
          <div className="flex-1 max-w-sm relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Søk i grupper..."
              value={memberSearch} 
              onChange={e => setMemberSearch(e.target.value)} 
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-theme outline-none focus:ring-1 focus:ring-primary text-sm" 
            />
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button onClick={() => {
                setNewGroupCategory(getDefaultNewGroupCategory());
                setIsCreateModalOpen(true);
              }} className="px-4 py-1.5 bg-primary text-white rounded-theme text-xs font-bold shadow-sm hover:bg-primary-hover flex items-center gap-2 transition-all"><Plus size={14} /> Ny Gruppe</button>
            </div>
          )}
        </div>
      )}

      {selectedPersonId && selectedPerson && (
        <>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={() => setSelectedPersonId(null)}>
          <div className="bg-white rounded-theme shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-2 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedPersonId(null)} className="p-2 bg-white rounded-theme shadow-sm border border-slate-200 hover:bg-slate-50 transition-all text-slate-600"><ArrowLeft size={18}/></button>
                <h3 className="text-lg font-bold text-slate-900">Medlemskort: {selectedPerson.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const personFamilyMemberships = (db.familyMembers || []).filter(
                    fm => fm.person_id === selectedPersonId
                  );
                  const primaryMembership = personFamilyMemberships.find(fm => fm.isPrimaryResidence) || personFamilyMemberships[0];
                  if (!primaryMembership) return null;
                  return (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingFamilyFromPerson(primaryMembership.family_id);
                      }}
                      className="p-2 hover:bg-slate-200 rounded-theme transition-colors"
                      title="Vis familiekort"
                    >
                      <Home size={18} className="text-slate-600" />
                    </button>
                  );
                })()}
                {isAdmin && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPerson(selectedPerson);
                    }} 
                    className="p-2 hover:bg-slate-200 rounded-theme transition-colors"
                    title="Rediger person"
                  >
                    <Edit2 size={18} className="text-slate-600" />
                  </button>
                )}
                <button onClick={() => setSelectedPersonId(null)} className="p-2 hover:bg-slate-200 rounded-theme transition-colors">
                  <X size={20} className="text-slate-600" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
        <div className="animate-in slide-in-from-bottom-2 duration-300 space-y-6">

           <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
             {/* Profilpanel */}
             <div className="lg:col-span-4 space-y-6">
                <section className="bg-white p-6 rounded-theme shadow-sm border border-slate-200">
                  <div className="flex items-center gap-4 mb-6">
                    <img 
                      src={getAvatarUrl(selectedPerson)} 
                      alt={`${selectedPerson.name} avatar`}
                      onError={(e) => {
                        // Fallback hvis bildet ikke laster - bruk enkel URL
                        const fallbackUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(selectedPerson.name)}`;
                        (e.target as HTMLImageElement).src = fallbackUrl;
                      }}
                      style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                      className="border border-slate-200"
                    />
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">{selectedPerson.name}</h4>
                      {(() => {
                        // Sjekk om personen er gruppeleder eller nestleder i noen grupper
                        const groupMemberships = db.groupMembers.filter(gm => gm.person_id === selectedPersonId);
                        const isGroupLeader = groupMemberships.some(gm => gm.role === GroupRole.LEADER);
                        const isDeputyLeader = groupMemberships.some(gm => gm.role === GroupRole.DEPUTY_LEADER);
                        
                        if (selectedPerson.is_admin) {
                          return (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-theme border text-[10px] font-bold uppercase tracking-tight bg-primary-light text-primary border-primary-light">
                              Administrator
                            </span>
                          );
                        } else if (isGroupLeader || isDeputyLeader) {
                          return (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-tight bg-amber-100 text-amber-700 border-amber-200">
                              {isGroupLeader ? 'Gruppeleder' : 'Nestleder'}
                            </span>
                          );
                        } else {
                          return (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-tight bg-slate-100 text-slate-600 border-slate-200">
                              Medlem
                            </span>
                          );
                        }
                      })()}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-[11px] font-bold text-slate-400 uppercase border-b border-slate-100 pb-2">Kontaktinfo</h5>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 rounded-theme text-slate-400 border border-slate-100"><Mail size={16} /></div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 font-medium leading-none mb-1">E-post</p>
                        <p className="text-sm font-semibold text-slate-700 truncate">{selectedPerson.email || '–'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 rounded-theme text-slate-400 border border-slate-100"><Phone size={16} /></div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium leading-none mb-1">Telefon</p>
                        <p className="text-sm font-semibold text-slate-700">{selectedPerson.phone || '–'}</p>
                      </div>
                    </div>
                    {selectedPerson.birth_date && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 rounded-theme text-slate-400 border border-slate-100"><Calendar size={16} /></div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium leading-none mb-1">Fødselsdato</p>
                          <p className="text-sm font-semibold text-slate-700">
                            {new Intl.DateTimeFormat('no-NO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(selectedPerson.birth_date))}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Husstand Widget */}
                  {(() => {
                    const personFamilyMemberships = db.familyMembers.filter(fm => fm.person_id === selectedPersonId);
                    if (personFamilyMemberships.length === 0) return null;

                    const primaryMembership = personFamilyMemberships.find(fm => fm.isPrimaryResidence) || personFamilyMemberships[0];
                    const family = db.families.find(f => f.id === primaryMembership.family_id);
                    const familyMembers = db.familyMembers
                      .filter(fm => fm.family_id === primaryMembership.family_id && fm.person_id !== selectedPersonId)
                      .map(fm => db.persons.find(p => p.id === fm.person_id))
                      .filter(Boolean) as Person[];

                    if (familyMembers.length === 0) return null;

                    return (
                      <div className="mt-6 pt-6 border-t border-slate-100">
                        <h5 className="text-[11px] font-bold text-slate-400 uppercase mb-3">Husstand</h5>
                        <button
                          onClick={() => setViewingFamilyFromPerson(primaryMembership.family_id)}
                          className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-theme transition-all group text-left"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-700">{family?.name || 'Familie'}</span>
                            <ChevronRight size={14} className="text-slate-400 group-hover:text-primary transition-colors" />
                          </div>
                          <div className="flex -space-x-2">
                            {familyMembers.slice(0, 5).map(person => (
                              <img
                                key={person.id}
                                src={getAvatarUrl(person)}
                                alt={person.name}
                                title={person.name}
                                className="w-8 h-8 rounded-full border-2 border-white object-cover"
                              />
                            ))}
                            {familyMembers.length > 5 && (
                              <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-300 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-slate-600">+{familyMembers.length - 5}</span>
                              </div>
                            )}
                          </div>
                        </button>
                      </div>
                    );
                  })()}
                </section>
             </div>

             {/* Aktivitetspanel */}
             <div className="lg:col-span-8 space-y-6">
               <section className="bg-white rounded-theme shadow-sm border border-slate-200 overflow-hidden">
                 <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                   <Users className="text-slate-400" size={18} />
                   <h4 className="text-sm font-bold text-slate-800">Gruppemedlemskap</h4>
                 </div>
                <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {personData?.memberships.map(({ gm, group, serviceRole }) => {
                    // Først sjekk om personen er gruppeleder eller nestleder
                    const isLeader = gm.role === GroupRole.LEADER;
                    const isDeputyLeader = gm.role === GroupRole.DEPUTY_LEADER;

                    return (
                      <div key={gm.id} className="p-4 hover:bg-slate-50 rounded-theme border border-transparent hover:border-slate-200 transition-all group">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-theme flex items-center justify-center bg-slate-100 border border-slate-200 shrink-0">
                            {group && getIcon(group.category)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-800 text-sm mb-2">{group?.name}</p>
                            <div className="space-y-1.5">
                              {/* Vis gruppens rolle først (hvis leder/nestleder) */}
                              {(isLeader || isDeputyLeader) && (
                                <div className="flex items-center gap-1.5">
                                  {isLeader && <Star size={12} className="text-amber-500 fill-amber-500 shrink-0" />}
                                  {isDeputyLeader && <Shield size={12} className="text-primary shrink-0" />}
                                  <p className="text-[10px] font-bold text-slate-700">
                                    {isLeader ? 'Gruppeleder' : 'Nestleder'}
                                  </p>
                                </div>
                              )}
                              {/* Vis tjenesterolle hvis den finnes */}
                              {serviceRole && (
                                <div className="flex items-center gap-1.5">
                                  <Shield size={12} className="text-primary shrink-0" />
                                  <span className="inline-flex items-center px-2 py-0.5 bg-primary-light text-primary border border-primary-light rounded-theme text-[9px] font-semibold">
                                    {serviceRole.name}
                                  </span>
                                </div>
                              )}
                              {/* Vis "Medlem" hvis ingen lederrolle og ingen tjenesterolle */}
                              {!isLeader && !isDeputyLeader && !serviceRole && (
                                <p className="text-[10px] text-slate-400 font-medium">Medlem</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {personData?.memberships.length === 0 && (
                    <p className="col-span-full text-center py-6 text-slate-400 text-xs italic">Ingen registrerte medlemskap.</p>
                  )}
                </div>
               </section>

               <section className="bg-slate-900 rounded-theme shadow-sm overflow-hidden">
                 <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
                   <Calendar className="text-primary" size={18} />
                   <h4 className="text-sm font-bold text-white">Kommende vakter</h4>
                 </div>
                 <div className="p-3 space-y-2">
                   {personData?.upcomingAssignments.map((item, index) => {
                     const { a, occ, role, programItem } = item as any;
                     const uniqueKey = a?.id || programItem?.id || `item-${index}`;
                     
                     return (
                       <div key={uniqueKey} className="bg-slate-800/50 p-3 rounded-theme border border-slate-700 hover:border-primary/50 transition-all flex items-center justify-between group">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-700 rounded-theme flex flex-col items-center justify-center text-white border border-slate-600 group-hover:border-primary-light/30 transition-all">
                              <span className="text-[8px] font-bold uppercase leading-none mb-0.5">{new Intl.DateTimeFormat('no-NO', { month: 'short' }).format(new Date(occ!.date))}</span>
                              <span className="text-base font-bold leading-none">{new Date(occ!.date).getDate()}</span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white mb-0.5">{role?.name || (programItem ? programItem.title : 'Vakt')}</p>
                              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">
                                {occ?.title_override || 'Gudstjeneste'}
                                {programItem && role && ` • ${programItem.title}`}
                              </p>
                            </div>
                         </div>
                         <ChevronRight size={16} className="text-slate-600 group-hover:text-primary transition-colors" />
                       </div>
                     );
                   })}
                   {personData?.upcomingAssignments.length === 0 && (
                     <div className="text-center py-8">
                        <p className="text-xs text-slate-500">Ingen planlagte vakter.</p>
                     </div>
                   )}
                 </div>
              </section>
            </div>
          </div>
          </div>
           </div>
         </div>
       </div>
      {/* Family Modal Overlay (from Person Card) */}
      {viewingFamilyFromPerson && (() => {
          const viewingFamily = db.families.find(f => f.id === viewingFamilyFromPerson);
          if (!viewingFamily) return null;

          const familyMembers = (db.familyMembers || []).filter(fm => fm.family_id === viewingFamilyFromPerson);
          const parents = familyMembers
            .filter(fm => fm.role === FamilyRole.PARENT || fm.role === FamilyRole.PARTNER)
            .map(fm => ({
              member: fm,
              person: db.persons.find(p => p.id === fm.person_id)
            }))
            .filter(({ person }) => person !== undefined) as Array<{ member: FamilyMember; person: Person }>;
          
          const children = familyMembers
            .filter(fm => fm.role === FamilyRole.CHILD)
            .map(fm => ({
              member: fm,
              person: db.persons.find(p => p.id === fm.person_id)
            }))
            .filter(({ person }) => person !== undefined) as Array<{ member: FamilyMember; person: Person }>;

          const familyAddress = viewingFamily.streetAddress || viewingFamily.city ? 
            `${viewingFamily.streetAddress || ''}${viewingFamily.streetAddress && viewingFamily.postalCode ? ', ' : ''}${viewingFamily.postalCode || ''} ${viewingFamily.city || ''}`.trim() : 
            null;

          return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4" onClick={() => setViewingFamilyFromPerson(null)}>
              <div className="bg-white rounded-theme shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    {parents.length > 0 ? (
                      <div className="text-xl font-bold text-slate-900">
                        {(() => {
                          const familyLastName = parents[0] ? splitName(parents[0].person.name).lastName : '';
                          return (
                            <>
                              {parents.map(({ person }, index) => {
                                const { firstName } = splitName(person.name);
                                return (
                                  <React.Fragment key={person.id}>
                                    <span className="text-slate-900">
                                      {firstName}
                                    </span>
                                    {index < parents.length - 1 ? ' og ' : ''}
                                  </React.Fragment>
                                );
                              })}
                              {familyLastName && (
                                <span className="text-slate-900"> {familyLastName}</span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <h2 className="text-xl font-bold text-slate-900">{viewingFamily.name || 'Familie uten navn'}</h2>
                    )}
                    {familyAddress && (
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin size={14} className="text-slate-400" />
                        <p className="text-sm text-slate-600">{familyAddress}</p>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setViewingFamilyFromPerson(null)} className="p-2 hover:bg-slate-200 rounded-theme transition-colors">
                    <X size={20} className="text-slate-600" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Foreldre/Ektefeller */}
                  {parents.length > 0 && (
                    <section>
                      <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <Users size={16} className="text-primary" /> Foreldre/Ektefeller
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {parents.map(({ member, person }) => (
                          <div 
                            key={member.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingFamilyFromPerson(null);
                              setSelectedPersonId(person.id);
                            }}
                            className="bg-white border border-slate-200 rounded-theme p-4 hover:border-primary-light hover:shadow-md transition-all cursor-pointer group"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2 flex-1">
                                <img 
                                  src={getAvatarUrl(person)}
                                  alt={`${person.name} avatar`}
                                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                                  className="border border-slate-200"
                                />
                                {member.role === FamilyRole.PARENT ? (
                                  <User size={18} className="text-primary-light0" />
                                ) : (
                                  <Heart size={18} className="text-rose-500" />
                                )}
                                <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors">
                                  {person.name}
                                </h4>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">
                                {member.role === FamilyRole.PARENT ? 'Forelder' : 'Partner'}
                              </span>
                            </div>
                            {person.phone && (
                              <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                                <Phone size={12} className="text-slate-400" />
                                {person.phone}
                              </div>
                            )}
                            {person.email && (
                              <div className="flex items-center gap-2 text-xs text-slate-600">
                                <Mail size={12} className="text-slate-400" />
                                {person.email}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Barn */}
                  {children.length > 0 && (
                    <section>
                      <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <Baby size={16} className="text-primary-light0" /> Barn
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {children.map(({ member, person }) => {
                          const age = calculateAge(person.birth_date);
                          const hasOtherFamilies = (db.familyMembers || []).filter(
                            fm => fm.person_id === person.id && fm.family_id !== viewingFamilyFromPerson
                          ).length > 0;
                          
                          return (
                            <div 
                              key={member.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingFamilyFromPerson(null);
                                setSelectedPersonId(person.id);
                              }}
                              className="bg-white border border-slate-200 rounded-theme p-4 hover:border-primary-light hover:shadow-md transition-all cursor-pointer group"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2 flex-1">
                                  <img 
                                    src={getAvatarUrl(person)}
                                    alt={`${person.name} avatar`}
                                    style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                                    className="border border-slate-200"
                                  />
                                  <Baby size={16} className="text-primary-light" />
                                  <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors">
                                    {person.name}
                                  </h4>
                                </div>
                              </div>
                              {age && (
                                <p className="text-xs text-slate-500 mb-2">{age}</p>
                              )}
                              {hasOtherFamilies && (
                                <div className="flex items-center gap-1 text-xs text-amber-600 mb-2">
                                  <Home size={12} />
                                  {member.isPrimaryResidence ? 'Hovedadresse' : 'Delt bosted'}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
        </>
      )}
      {!selectedPersonId && activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-3 rounded-theme border border-slate-200 shadow-sm">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" placeholder="Søk i roller..." value={roleSearch} onChange={e => setRoleSearch(e.target.value)} className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-theme outline-none focus:ring-1 focus:ring-primary-light0 text-sm" />
            </div>
            {isAdmin && <button onClick={() => setIsCreateServiceRoleModalOpen(true)} className="px-4 py-1.5 bg-primary text-white rounded-theme text-xs font-bold hover:bg-primary-hover shadow-sm flex items-center gap-2 transition-all"><Plus size={14} /> Ny Rolle</button>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {filteredRoles.map(sr => (
              <button 
                key={sr.id} 
                onClick={() => setViewingRoleId(sr.id)}
                className="bg-white p-3 rounded-theme border border-slate-200 shadow-sm hover:border-primary hover:shadow transition-all text-left group flex flex-col justify-between h-full min-h-[90px]"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-1 bg-slate-50 rounded-theme border border-slate-100 text-slate-400 group-hover:text-primary group-hover:bg-primary-light transition-colors">
                      <Library size={12} />
                    </div>
                    {isAdmin && <Edit2 size={10} className="text-slate-300 opacity-0 group-hover:opacity-100" />}
                  </div>
                  <h4 className="font-bold text-slate-800 text-[13px] leading-tight line-clamp-2">{sr.name}</h4>
                </div>
                
                <div className="mt-2 flex items-center justify-end">
                  {sr.default_instructions.length > 0 && (
                    <div className="flex items-center gap-1 text-primary" title="Instrukser tilgjengelig">
                      <ListChecks size={12} />
                      <span className="text-[9px] font-bold uppercase">Instruks</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      {!selectedPersonId && activeTab === 'persons' && (
        <div className="bg-white rounded-theme border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Søk person..." value={personSearch} onChange={e => setPersonSearch(e.target.value)} className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-theme text-sm outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {isAdmin && (
                  <button 
                    onClick={() => setIsCreatePersonModalOpen(true)} 
                    className="w-full md:w-auto px-4 py-2 bg-primary text-white rounded-theme text-xs font-bold shadow-sm hover:bg-primary-hover transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={14} /> 
                    Ny Person
                  </button>
                )}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsColumnPickerOpen(prev => !prev)}
                    className="w-full md:w-auto px-4 py-2 border border-slate-200 bg-white rounded-theme text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Vis/skjul kolonner
                  </button>
                  {isColumnPickerOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsColumnPickerOpen(false)} />
                      <div className="absolute right-0 z-50 mt-2 w-56 rounded-theme border border-slate-200 bg-white shadow-lg p-3 space-y-2">
                        <label className="flex items-center gap-2 text-xs text-slate-600">
                          <input type="checkbox" checked={visibleColumns.birthDate} onChange={() => setVisibleColumns(prev => ({ ...prev, birthDate: !prev.birthDate }))} />
                          Fødselsdato
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-600">
                          <input type="checkbox" checked={visibleColumns.role} onChange={() => setVisibleColumns(prev => ({ ...prev, role: !prev.role }))} />
                          Tilgangskontroll
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-600">
                          <input type="checkbox" checked={visibleColumns.groups} onChange={() => setVisibleColumns(prev => ({ ...prev, groups: !prev.groups }))} />
                          Grupper
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-600">
                          <input type="checkbox" checked={visibleColumns.email} onChange={() => setVisibleColumns(prev => ({ ...prev, email: !prev.email }))} />
                          E-post
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-600">
                          <input type="checkbox" checked={visibleColumns.phone} onChange={() => setVisibleColumns(prev => ({ ...prev, phone: !prev.phone }))} />
                          Telefon
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-600">
                          <input type="checkbox" checked={visibleColumns.address} onChange={() => setVisibleColumns(prev => ({ ...prev, address: !prev.address }))} />
                          Adresse
                        </label>
                      </div>
                    </>
                  )}
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      const selectedPersonIds = filteredPersons.map(p => p.id);
                      setNewGroupMemberIds(selectedPersonIds);
                    setNewGroupCategory(getDefaultNewGroupCategory());
                      setIsCreateModalOpen(true);
                    }}
                    className="w-full md:w-auto px-4 py-2 bg-primary text-white rounded-theme text-xs font-bold shadow-sm hover:bg-primary-hover transition-all flex items-center justify-center gap-2"
                    title={`Opprett gruppe med ${filteredPersons.length} personer fra utvalget`}
                  >
                    <Plus size={14} />
                    Opprett gruppe fra utvalg ({filteredPersons.length})
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-400 uppercase font-bold">
                  <th 
                    className="py-3 px-6 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    onClick={() => {
                      if (sortColumn === 'name') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortColumn('name');
                        setSortDirection('asc');
                      }
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      Navn
                      {sortColumn === 'name' && (
                        <span className="text-primary">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  {visibleColumns.birthDate && (
                    <th 
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none relative"
                      onClick={() => {
                        if (sortColumn === 'birthDate') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortColumn('birthDate');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          Født
                          {sortColumn === 'birthDate' && (
                            <span className="text-primary">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenColumnFilter(prev => prev === 'birthDate' ? null : 'birthDate');
                          }}
                          className={`${columnBirthYears.size > 0 ? 'text-primary' : 'text-slate-400'} hover:text-primary`}
                          title="Filter"
                        >
                          <Filter size={12} />
                        </button>
                      </div>
                      {openColumnFilter === 'birthDate' && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setOpenColumnFilter(null)} />
                          <div
                            className="absolute z-30 mt-2 w-48 rounded-theme border border-slate-200 bg-white shadow-lg p-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                              <span>Årstall</span>
                              <button
                                type="button"
                                onClick={() => setColumnBirthYears(new Set())}
                                className="text-slate-500 hover:text-primary"
                              >
                                Nullstill
                              </button>
                            </div>
                            <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                              {availableBirthYears.map(year => (
                                <label key={year} className="flex items-center gap-2 text-xs text-slate-600">
                                  <input
                                    type="checkbox"
                                    checked={columnBirthYears.has(year)}
                                    onChange={() => {
                                      setColumnBirthYears(prev => {
                                        const next = new Set(prev);
                                        if (next.has(year)) next.delete(year);
                                        else next.add(year);
                                        return next;
                                      });
                                    }}
                                  />
                                  {year}
                                </label>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </th>
                  )}
                  {visibleColumns.role && (
                    <th 
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none relative"
                      onClick={() => {
                        if (sortColumn === 'role') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortColumn('role');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          Tilgangskontroll
                          {sortColumn === 'role' && (
                            <span className="text-primary">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenColumnFilter(prev => prev === 'role' ? null : 'role');
                          }}
                          className={`${columnRoles.size > 0 ? 'text-primary' : 'text-slate-400'} hover:text-primary`}
                          title="Filter"
                        >
                          <Filter size={12} />
                        </button>
                      </div>
                      {openColumnFilter === 'role' && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setOpenColumnFilter(null)} />
                          <div
                            className="absolute z-30 mt-2 w-48 rounded-theme border border-slate-200 bg-white shadow-lg p-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                              <span>Rolle</span>
                              <button
                                type="button"
                                onClick={() => setColumnRoles(new Set())}
                                className="text-slate-500 hover:text-primary"
                              >
                                Nullstill
                              </button>
                            </div>
                            <div className="mt-2 space-y-1">
                              {availableRoles.map(role => (
                                <label key={role} className="flex items-center gap-2 text-xs text-slate-600">
                                  <input
                                    type="checkbox"
                                    checked={columnRoles.has(role)}
                                    onChange={() => {
                                      setColumnRoles(prev => {
                                        const next = new Set(prev);
                                        if (next.has(role)) next.delete(role);
                                        else next.add(role);
                                        return next;
                                      });
                                    }}
                                  />
                                  {role}
                                </label>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </th>
                  )}
                  {visibleColumns.groups && (
                    <th
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none relative"
                      onClick={() => {
                        if (sortColumn === 'groups') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortColumn('groups');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          Grupper
                          {sortColumn === 'groups' && (
                            <span className="text-primary">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenColumnFilter(prev => prev === 'groups' ? null : 'groups');
                          }}
                          className={`${columnGroups.size > 0 ? 'text-primary' : 'text-slate-400'} hover:text-primary`}
                          title="Filter"
                        >
                          <Filter size={12} />
                        </button>
                      </div>
                      {openColumnFilter === 'groups' && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setOpenColumnFilter(null)} />
                          <div
                            className="absolute z-30 mt-2 w-56 rounded-theme border border-slate-200 bg-white shadow-lg p-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                              <span>Grupper</span>
                              <button
                                type="button"
                                onClick={() => setColumnGroups(new Set())}
                                className="text-slate-500 hover:text-primary"
                              >
                                Nullstill
                              </button>
                            </div>
                            <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                              {availableGroups.map(group => (
                                <label key={group.id} className="flex items-center gap-2 text-xs text-slate-600">
                                  <input
                                    type="checkbox"
                                    checked={columnGroups.has(group.id)}
                                    onChange={() => {
                                      setColumnGroups(prev => {
                                        const next = new Set(prev);
                                        if (next.has(group.id)) next.delete(group.id);
                                        else next.add(group.id);
                                        return next;
                                      });
                                    }}
                                  />
                                  {group.name}
                                </label>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </th>
                  )}
                  {visibleColumns.email && <th className="py-3 px-4">E-post</th>}
                  {visibleColumns.phone && <th className="py-3 px-4">Telefon</th>}
                  {visibleColumns.address && (
                    <th 
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => {
                        if (sortColumn === 'address') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortColumn('address');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        Adresse
                        {sortColumn === 'address' && (
                          <span className="text-primary">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  )}
                  <th className="py-3 px-4 text-right">Handling</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPersons.map(person => {
                  const address = person.streetAddress || person.city ? 
                    `${person.streetAddress || ''}${person.streetAddress && person.postalCode ? ', ' : ''}${person.postalCode || ''} ${person.city || ''}`.trim() : 
                    null;
                  
                  // Sjekk om personen er gruppeleder eller nestleder i noen grupper
                  const groupMemberships = db.groupMembers.filter(gm => gm.person_id === person.id);
                  const isGroupLeader = groupMemberships.some(gm => gm.role === GroupRole.LEADER);
                  const isDeputyLeader = groupMemberships.some(gm => gm.role === GroupRole.DEPUTY_LEADER);
                  const groupNames = Array.from(new Set(groupMemberships
                    .map(gm => db.groups.find(g => g.id === gm.group_id)?.name)
                    .filter(Boolean))) as string[];
                  const groupsLabel = groupNames.length > 0 ? groupNames.join(', ') : '–';

                  const personFamilyMemberships = (db.familyMembers || []).filter(fm => fm.person_id === person.id);
                  const primaryFamilyMembership = personFamilyMemberships.find(fm => fm.isPrimaryResidence) || personFamilyMemberships[0];
                  const primaryFamilyId = primaryFamilyMembership?.family_id;
                  
                  let roleLabel = 'Medlem';
                  let roleColorClass = 'bg-slate-100 text-slate-600 border-slate-200';
                  if (person.is_admin) {
                    roleLabel = 'Administrator';
                    roleColorClass = 'bg-primary-light text-primary border-primary-light';
                  } else if (isGroupLeader) {
                    roleLabel = 'Gruppeleder';
                    roleColorClass = 'bg-amber-100 text-amber-700 border-amber-200';
                  } else if (isDeputyLeader) {
                    roleLabel = 'Nestleder';
                    roleColorClass = 'bg-amber-100 text-amber-700 border-amber-200';
                  }
                  
                  const formattedBirthDate = person.birth_date ? new Intl.DateTimeFormat('no-NO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(person.birth_date)) : null;
                  
                  return (
                    <tr key={person.id} onClick={() => setSelectedPersonId(person.id)} className="group hover:bg-slate-50 transition-colors cursor-pointer">
                      <td className="py-3 px-6 font-bold text-sm text-slate-800">
                        <div className="flex items-center">
                          <img 
                            src={getAvatarUrl(person)} 
                            alt={`${person.name} avatar`}
                            onError={(e) => {
                              // Fallback hvis bildet ikke laster - bruk enkel URL
                              const fallbackUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(person.name)}`;
                              (e.target as HTMLImageElement).src = fallbackUrl;
                            }}
                            style={{ width: '32px', height: '32px', borderRadius: '50%', marginRight: '10px', objectFit: 'cover', display: 'block' }}
                          />
                          {person.name}
                          {primaryFamilyId && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingFamilyId(primaryFamilyId);
                              }}
                              className="ml-2 p-1 rounded-theme bg-slate-100 text-slate-500 hover:text-primary hover:bg-primary-light transition-colors"
                              title="Vis familiekort"
                            >
                              <Home size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                      {visibleColumns.birthDate && (
                        <td className="py-3 px-4 text-xs text-slate-500">{formattedBirthDate || '–'}</td>
                      )}
                      {visibleColumns.role && (
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-tight ${roleColorClass}`}>
                            {roleLabel}
                          </span>
                        </td>
                      )}
                      {visibleColumns.groups && (
                        <td className="py-3 px-4 text-xs text-slate-500 max-w-[220px] truncate" title={groupsLabel}>
                          {groupsLabel}
                        </td>
                      )}
                      {visibleColumns.email && (
                        <td className="py-3 px-4 text-xs text-slate-500">{person.email || '–'}</td>
                      )}
                      {visibleColumns.phone && (
                        <td className="py-3 px-4 text-xs text-slate-500">{person.phone || '–'}</td>
                      )}
                      {visibleColumns.address && (
                        <td className="py-3 px-4 text-xs text-slate-500 max-w-[200px] truncate" title={address || undefined}>
                          {address || '–'}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {isAdmin && (
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingPerson(person)} className="p-1.5 text-slate-400 hover:text-primary bg-slate-100 rounded-theme transition-colors"><Edit2 size={14} /></button>
                            <button onClick={() => handleDeletePerson(person.id)} className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-100 rounded-theme transition-colors"><Trash2 size={14} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!selectedPersonId && activeTab === 'groups' && (
        <div className="space-y-4">
          {/* Tag Pills + View Switcher */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-3 rounded-theme border border-slate-200 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {['Alle', ...allGroupTags].map(tag => {
                const count = tagCounts[tag] || 0;
                const isSelected = selectedGroupTags.has(tag);
                const isCustomTag = customGroupTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => {
                      if (tag === 'Alle') {
                        setSelectedGroupTags(new Set(['Alle']));
                      } else {
                        const newTags = new Set(selectedGroupTags);
                        newTags.delete('Alle');
                        if (isSelected) {
                          newTags.delete(tag);
                          if (newTags.size === 0) newTags.add('Alle');
                        } else {
                          newTags.add(tag);
                        }
                        setSelectedGroupTags(newTags);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1 ${
                      isSelected
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{tag} ({count})</span>
                    {isAdmin && isCustomTag && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Slette kategorien "${tag}"?`)) {
                            handleDeleteCustomTag(tag);
                          }
                        }}
                        className={`ml-1 rounded-full px-1 ${isSelected ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}
                        title="Slett kategori"
                        role="button"
                      >
                        ×
                      </span>
                    )}
                  </button>
                );
              })}
              {isAdmin && (
                <div className="flex items-center">
                  {isAddingCustomTag ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newCustomTag}
                        onChange={(e) => setNewCustomTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomTag();
                          }
                          if (e.key === 'Escape') {
                            setIsAddingCustomTag(false);
                            setNewCustomTag('');
                          }
                        }}
                        className="px-2 py-1 text-xs border border-slate-200 rounded-theme outline-none focus:ring-1 focus:ring-primary-light0"
                        placeholder="Ny kategori"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomTag}
                        className="px-2 py-1 text-xs font-bold bg-primary text-white rounded-theme hover:bg-primary-hover"
                      >
                        Legg til
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCustomTag(false);
                          setNewCustomTag('');
                        }}
                        className="px-2 py-1 text-xs text-slate-600 hover:text-slate-800"
                      >
                        Avbryt
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingCustomTag(true)}
                      className="ml-1 px-2 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                      title="Legg til kategori"
                    >
                      <Plus size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* View Switcher */}
              <div className="inline-flex bg-slate-100 rounded-theme p-0.5">
                <button
                  onClick={() => setGroupViewMode('tiles')}
                  className={`p-1.5 rounded-theme transition-all ${
                    groupViewMode === 'tiles'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Tiles visning"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setGroupViewMode('table')}
                  className={`p-1.5 rounded-theme transition-all ${
                    groupViewMode === 'table'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Tabell visning"
                >
                  <Table size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Groups Display */}
          {groupViewMode === 'tiles' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGroups.length > 0 ? filteredGroups.map(group => {
                const members = db.groupMembers.filter(gm => gm.group_id === group.id);
                const leaderMembers = members.filter(m => m.role === GroupRole.LEADER).map(m => db.persons.find(p => p.id === m.person_id)).filter(Boolean) as Person[];
                const deputyLeaderMembers = members.filter(m => m.role === GroupRole.DEPUTY_LEADER).map(m => db.persons.find(p => p.id === m.person_id)).filter(Boolean) as Person[];
                const groupTags = getGroupTags(group);
                
                return (
                  <button 
                    key={group.id} 
                    onClick={() => setViewingGroupId(group.id)}
                    className="bg-white rounded-theme p-4 border border-slate-200 shadow-sm hover:border-primary hover:shadow-md transition-all group relative flex flex-col h-full text-left"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 border border-slate-100 rounded-theme">{getIcon(group.category)}</div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{group.name}</h3>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase">{getCategoryTag(group.category)}</p>
                        </div>
                      </div>
                      {canManageGroup(group.id) && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setManageGroupId(group.id); }} className="p-1.5 text-slate-300 hover:text-primary rounded-theme transition-all"><Edit2 size={14} /></button>
                          {isAdmin && (
                            <button onClick={(e) => { e.stopPropagation(); setIsDeletingGroup(group.id); }} className="p-1.5 text-slate-300 hover:text-rose-600 rounded-theme transition-all"><Trash2 size={14} /></button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Tags */}
                    {groupTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {groupTags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[9px] font-bold">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <p className="text-slate-500 text-xs mb-4 flex-grow line-clamp-2 leading-relaxed">{group.description || 'Ingen beskrivelse tilgjengelig.'}</p>
                    <div className="pt-3 border-t border-slate-100 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{members.length} medl.</span>
                        {leaderMembers.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <img 
                              src={getAvatarUrl(leaderMembers[0])}
                              alt={`${leaderMembers[0].name} avatar`}
                              style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
                              className="border border-amber-200"
                            />
                            <Star size={10} className="text-amber-500 fill-amber-500" />
                            <p className="text-[10px] font-bold text-slate-700 truncate max-w-[120px]">{leaderMembers[0].name}</p>
                          </div>
                        )}
                      </div>
                      {deputyLeaderMembers.length > 0 && (
                        <div className="flex items-center gap-1.5 justify-end">
                          <img 
                            src={getAvatarUrl(deputyLeaderMembers[0])}
                            alt={`${deputyLeaderMembers[0].name} avatar`}
                            style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
                            className="border border-blue-200"
                          />
                          <Star size={10} className="text-blue-500 fill-blue-500" />
                          <p className="text-[10px] font-bold text-slate-600 truncate max-w-[120px]">{deputyLeaderMembers[0].name} (Nestleder)</p>
                        </div>
                      )}
                      {leaderMembers.length === 0 && deputyLeaderMembers.length === 0 && (
                        <p className="text-[10px] font-bold text-slate-400 text-right">Uten leder</p>
                      )}
                    </div>
                  </button>
                );
              }) : (
                <div className="col-span-full bg-white rounded-theme border border-slate-200 shadow-sm p-8 text-center">
                  <p className="text-slate-500 text-sm">Ingen grupper funnet.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-theme border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Gruppe</th>
                    <th className="py-3 px-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Tags</th>
                    <th className="py-3 px-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Beskrivelse</th>
                    <th className="py-3 px-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wide">Medlemmer</th>
                    <th className="py-3 px-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Leder</th>
                    <th className="py-3 px-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wide"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGroups.length > 0 ? filteredGroups.map(group => {
                    const members = db.groupMembers.filter(gm => gm.group_id === group.id);
                    const leaderMembers = members.filter(m => m.role === GroupRole.LEADER).map(m => db.persons.find(p => p.id === m.person_id)).filter(Boolean) as Person[];
                    const groupTags = getGroupTags(group);
                    
                    return (
                      <tr 
                        key={group.id}
                        onClick={() => setViewingGroupId(group.id)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors group"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-slate-50 border border-slate-100 rounded-theme">{getIcon(group.category)}</div>
                            <div>
                              <div className="text-sm font-bold text-slate-900">{group.name}</div>
                              <div className="text-[10px] font-semibold text-slate-400 uppercase">{getCategoryTag(group.category)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {groupTags.map(tag => (
                              <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[9px] font-bold">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 max-w-[300px] truncate">
                          {group.description || '–'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-xs font-bold text-slate-700">{members.length}</span>
                        </td>
                        <td className="py-3 px-4">
                          {leaderMembers.length > 0 ? (
                            <div className="flex items-center gap-2">
                              <img 
                                src={getAvatarUrl(leaderMembers[0])}
                                alt={`${leaderMembers[0].name} avatar`}
                                style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                                className="border border-amber-200"
                              />
                              <span className="text-xs text-slate-700">{leaderMembers[0].name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">–</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          {canManageGroup(group.id) && (
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); setManageGroupId(group.id); }} className="p-1.5 text-slate-400 hover:text-primary bg-slate-100 rounded-theme transition-colors"><Edit2 size={14} /></button>
                              {isAdmin && (
                                <button onClick={(e) => { e.stopPropagation(); setIsDeletingGroup(group.id); }} className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-100 rounded-theme transition-colors"><Trash2 size={14} /></button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center">
                        <p className="text-slate-500 text-sm">Ingen grupper funnet.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Ny Familie Modal */}
      {isCreateFamilyModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
          <div className="absolute inset-0" onClick={() => { setIsCreateFamilyModalOpen(false); setNewFamilyName(''); }}></div>
          <div className="relative bg-white w-full max-w-md rounded-theme shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 text-left">
            <div className="px-5 py-4 border-b border-primary-light flex justify-between items-center bg-primary-light/50 shrink-0">
              <div className="flex items-center gap-3 text-primary">
                <Users size={20} />
                <h3 className="font-bold">Opprett Ny Familie</h3>
              </div>
              <button onClick={() => { setIsCreateFamilyModalOpen(false); setNewFamilyName(''); }} className="p-1 hover:bg-primary-light rounded-theme transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateFamily} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Familienavn</label>
                <input
                  autoFocus
                  required
                  type="text"
                  value={newFamilyName}
                  onChange={(e) => setNewFamilyName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm font-bold focus:ring-1 focus:ring-primary-light0 outline-none"
                  placeholder="f.eks. Familien Hansen"
                />
              </div>
              <button type="submit" className="w-full py-2 bg-primary text-white rounded-theme font-bold text-sm shadow-sm hover:bg-primary-hover transition-all">
                Opprett Familie
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Legg til Familiemedlem Modal */}
      {isAddMemberModalOpen && selectedFamilyForMember && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
          <div className="absolute inset-0" onClick={() => {
            setIsAddMemberModalOpen(false);
            setSelectedFamilyForMember(null);
            setMemberPersonId(null);
            setMemberPersonSearch('');
            setNewlyCreatedFamilyId(null);
            setIsNewPerson(false);
            setNewPersonEmail('');
            setNewPersonPhone('');
            setNewPersonBirthYear('');
            setNewPersonBirthDate('');
          }}></div>
          <div className="relative bg-white w-full max-w-md rounded-theme shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 text-left max-h-[90vh]">
            <div className="px-5 py-4 border-b border-primary-light flex justify-between items-center bg-primary-light/50 shrink-0">
              <div className="flex items-center gap-3 text-primary">
                <UserPlus size={20} />
                <h3 className="font-bold">{newlyCreatedFamilyId ? 'Legg til første medlem' : 'Legg til familiemedlem'}</h3>
              </div>
              <button onClick={() => {
                setIsAddMemberModalOpen(false);
                setSelectedFamilyForMember(null);
                setMemberPersonId(null);
                setMemberPersonSearch('');
                setNewlyCreatedFamilyId(null);
                setIsNewPerson(false);
                setNewPersonEmail('');
                setNewPersonPhone('');
                setNewPersonBirthYear('');
                setNewPersonBirthDate('');
              }} className="p-1 hover:bg-primary-light rounded-theme transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddFamilyMember} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Søk eller legg til person</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    value={memberPersonSearch}
                    onChange={(e) => {
                      const searchValue = e.target.value;
                      setMemberPersonSearch(searchValue);
                      
                      // Sjekk om navnet matcher eksisterende person
                      const matchingPerson = db.persons.find(p => 
                        p.name.toLowerCase() === searchValue.toLowerCase().trim()
                      );
                      
                      if (matchingPerson) {
                        setMemberPersonId(matchingPerson.id);
                        setIsNewPerson(false);
                      } else if (searchValue.trim().length > 0) {
                        setMemberPersonId(null);
                        setIsNewPerson(true);
                      } else {
                        setMemberPersonId(null);
                        setIsNewPerson(false);
                      }
                    }}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm focus:ring-1 focus:ring-primary-light0 outline-none"
                    placeholder="Skriv navn for å søke eller opprett ny..."
                  />
                </div>
                
                {/* Autocomplete dropdown - vis kun hvis ingen eksakt match */}
                {memberPersonSearch && !memberPersonId && memberPersonSearch.trim().length >= 2 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border border-slate-200 rounded-theme bg-white shadow-lg">
                    {db.persons
                      .filter(p => {
                        const isAlreadyMember = (db.familyMembers || [])
                          .some(fm => fm.family_id === selectedFamilyForMember && fm.person_id === p.id);
                        const matchesSearch = p.name.toLowerCase().includes(memberPersonSearch.toLowerCase());
                        const exactMatch = p.name.toLowerCase() === memberPersonSearch.toLowerCase().trim();
                        // Vis ikke eksakt match (den er allerede valgt)
                        return matchesSearch && !exactMatch && !isAlreadyMember;
                      })
                      .map(person => (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => {
                            setMemberPersonId(person.id);
                            setMemberPersonSearch(person.name);
                            setIsNewPerson(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-primary-light transition-colors border-b border-slate-100 last:border-b-0"
                        >
                          <p className="text-sm font-semibold text-slate-800">{person.name}</p>
                          <p className="text-xs text-slate-500">{person.email}</p>
                        </button>
                      ))}
                    {db.persons.filter(p => {
                      const isAlreadyMember = (db.familyMembers || [])
                        .some(fm => fm.family_id === selectedFamilyForMember && fm.person_id === p.id);
                      const exactMatch = p.name.toLowerCase() === memberPersonSearch.toLowerCase().trim();
                      return p.name.toLowerCase().includes(memberPersonSearch.toLowerCase()) && !exactMatch && !isAlreadyMember;
                    }).length === 0 && (
                      <div className="px-3 py-2 text-xs text-slate-500 italic">
                        Ingen match funnet. Fortsett å skrive for å opprette ny person.
                      </div>
                    )}
                  </div>
                )}

                {/* Valgt eksisterende person */}
                {memberPersonId && !isNewPerson && (
                  <div className="mt-2 p-3 bg-primary-light rounded-theme border border-primary-light">
                    <p className="text-xs font-bold text-primary mb-1">Valgt: {db.persons.find(p => p.id === memberPersonId)?.name}</p>
                    <p className="text-xs text-primary">{db.persons.find(p => p.id === memberPersonId)?.email}</p>
                  </div>
                )}

                {/* Indikasjon for ny person */}
                {isNewPerson && !memberPersonId && memberPersonSearch.trim().length > 0 && (
                  <div className="mt-2 p-3 bg-amber-50 rounded-theme border border-amber-200">
                    <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-2">
                      <Plus size={14} />
                      Ny person vil bli lagt til i katalogen
                    </p>
                    <p className="text-[10px] text-amber-700">
                      Fyll ut informasjon nedenfor for å fullføre registreringen. Alle felter er valgfrie.
                    </p>
                  </div>
                )}

                {/* Ekstra felter for ny person */}
                {isNewPerson && !memberPersonId && (
                  <div className="mt-4 space-y-3 pt-4 border-t border-slate-200">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                        E-post (valgfritt)
                      </label>
                      <input
                        type="email"
                        value={newPersonEmail}
                        onChange={(e) => setNewPersonEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm focus:ring-1 focus:ring-primary-light0 outline-none"
                        placeholder="person@eksempel.no"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                        Telefon (valgfritt)
                      </label>
                      <input
                        type="tel"
                        value={newPersonPhone}
                        onChange={(e) => setNewPersonPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm focus:ring-1 focus:ring-primary-light0 outline-none"
                        placeholder="+47 123 45 678"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                          Fødselsår (valgfritt)
                        </label>
                        <input
                          type="number"
                          min="1900"
                          max={new Date().getFullYear()}
                          value={newPersonBirthYear}
                          onChange={(e) => setNewPersonBirthYear(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm focus:ring-1 focus:ring-primary-light0 outline-none"
                          placeholder="f.eks. 1990"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                          Fødselsdato (valgfritt)
                        </label>
                        <input
                          type="date"
                          value={newPersonBirthDate}
                          onChange={(e) => setNewPersonBirthDate(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm focus:ring-1 focus:ring-primary-light0 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Rolle i familien</label>
                <select
                  value={memberFamilyRole}
                  onChange={(e) => setMemberFamilyRole(e.target.value as FamilyRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm font-bold focus:ring-1 focus:ring-primary-light0 outline-none"
                >
                  <option value={FamilyRole.PARENT}>Forelder</option>
                  <option value={FamilyRole.CHILD}>Barn</option>
                  <option value={FamilyRole.PARTNER}>Ektefelle/Partner</option>
                  <option value={FamilyRole.GUARDIAN}>Vergemål</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isSecondaryResidence"
                  checked={memberIsSecondaryResidence}
                  onChange={(e) => setMemberIsSecondaryResidence(e.target.checked)}
                  className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary-light0"
                />
                <label htmlFor="isSecondaryResidence" className="text-sm font-medium text-slate-700">
                  Dette er personens sekundæradresse (delt bosted)
                </label>
              </div>

              <button
                type="submit"
                disabled={!memberPersonSearch.trim()}
                className="w-full py-2 bg-primary text-white rounded-theme font-bold text-sm shadow-sm hover:bg-primary-hover transition-all disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {isNewPerson ? 'Opprett person og legg til i familie' : 'Legg til medlem'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Ny Rolle Modal */}
      {isCreateServiceRoleModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
          <div className="absolute inset-0" onClick={() => setIsCreateServiceRoleModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-theme shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 text-left">
            <div className="px-5 py-4 border-b border-primary-light flex justify-between items-center bg-primary-light/50 shrink-0">
              <div className="flex items-center gap-3 text-primary">
                <Library size={20} />
                <h3 className="font-bold">Opprett Ny Rolle</h3>
              </div>
              <button onClick={() => setIsCreateServiceRoleModalOpen(false)} className="p-1 hover:bg-primary-light rounded-theme transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateServiceRole} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Rollenavn</label>
                <input
                  autoFocus
                  required
                  name="name"
                  type="text"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm font-bold focus:ring-1 focus:ring-primary-light0 outline-none"
                  placeholder="f.eks. Møteleder"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Instrukser (én per linje)</label>
                <textarea
                  name="instructions"
                  rows={6}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm focus:ring-1 focus:ring-primary-light0 outline-none resize-none"
                  placeholder="1. Første instruks&#10;2. Andre instruks&#10;3. Tredje instruks"
                />
              </div>
              <button type="submit" className="w-full py-2 bg-primary text-white rounded-theme font-bold text-sm shadow-sm hover:bg-primary-hover transition-all">
                Opprett Rolle
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Ny Person Modal */}
      {isCreatePersonModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
          <div className="absolute inset-0" onClick={() => setIsCreatePersonModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-theme shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 text-left max-h-[90vh]">
            <div className="px-5 py-4 border-b border-primary-light flex justify-between items-center bg-primary-light/50 shrink-0">
              <div className="flex items-center gap-3 text-primary">
                <UserPlus size={20} />
                <h3 className="font-bold">Opprett Ny Person</h3>
              </div>
              <button onClick={() => setIsCreatePersonModalOpen(false)} className="p-1 hover:bg-primary-light rounded-theme transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreatePerson} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Navn *</label>
                <input
                  autoFocus
                  required
                  name="name"
                  type="text"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm font-bold focus:ring-1 focus:ring-primary-light0 outline-none"
                  placeholder="Fullt navn"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">E-post</label>
                <input
                  name="email"
                  type="email"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm focus:ring-1 focus:ring-primary-light0 outline-none"
                  placeholder="person@eksempel.no"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Telefon</label>
                <input
                  name="phone"
                  type="tel"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm focus:ring-1 focus:ring-primary-light0 outline-none"
                  placeholder="+47 123 45 678"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Bilde-URL</label>
                <input
                  name="imageUrl"
                  type="url"
                  value={newPersonImageUrl}
                  onChange={(e) => setNewPersonImageUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm focus:ring-1 focus:ring-primary-light0 outline-none"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Last opp bilde</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImageFileChange(file, setNewPersonImageUrl);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">Bildet lagres lokalt og kan brukes i alle visninger.</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Fødselsdato</label>
                <input
                  name="birth_date"
                  type="date"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm focus:ring-1 focus:ring-primary-light0 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Gateadresse</label>
                <input
                  name="streetAddress"
                  type="text"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm focus:ring-1 focus:ring-primary-light0 outline-none"
                  placeholder="Gate og husnummer"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Postnummer</label>
                  <input
                    name="postalCode"
                    type="text"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm focus:ring-1 focus:ring-primary-light0 outline-none"
                    placeholder="0000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Poststed</label>
                  <input
                    name="city"
                    type="text"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm focus:ring-1 focus:ring-primary-light0 outline-none"
                    placeholder="By"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  name="is_admin"
                  type="checkbox"
                  value="true"
                  className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary-light0"
                />
                <label className="text-sm font-medium text-slate-700">Gi administratorrettigheter</label>
              </div>
              <button type="submit" className="w-full py-2 bg-primary text-white rounded-theme font-bold text-sm shadow-sm hover:bg-primary-hover transition-all">
                Opprett Person
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Rediger Person Modal */}
      {editingPerson && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
          <div className="absolute inset-0" onClick={() => setEditingPerson(null)}></div>
          <div className="relative bg-white w-full max-w-md rounded-theme shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 text-left max-h-[90vh]">
            <div className="px-5 py-4 border-b border-primary-light flex justify-between items-center bg-primary-light/50 shrink-0">
              <div className="flex items-center gap-3 text-primary">
                <Edit2 size={20} />
                <h3 className="font-bold">Rediger Person</h3>
              </div>
              <button onClick={() => setEditingPerson(null)} className="p-1 hover:bg-primary-light rounded-theme transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdatePerson} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Navn *</label>
                <input
                  autoFocus
                  required
                  name="name"
                  type="text"
                  defaultValue={editingPerson.name}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm font-bold focus:ring-1 focus:ring-primary-light0 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">E-post</label>
                <input
                  name="email"
                  type="email"
                  defaultValue={editingPerson.email || ''}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm focus:ring-1 focus:ring-primary-light0 outline-none"
                  placeholder="person@eksempel.no"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Telefon</label>
                <input
                  name="phone"
                  type="tel"
                  defaultValue={editingPerson.phone || ''}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm focus:ring-1 focus:ring-primary-light0 outline-none"
                  placeholder="+47 123 45 678"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Bilde-URL</label>
                <input
                  name="imageUrl"
                  type="url"
                  value={editingPersonImageUrl}
                  onChange={(e) => setEditingPersonImageUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm focus:ring-1 focus:ring-primary-light0 outline-none"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Last opp bilde</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImageFileChange(file, setEditingPersonImageUrl);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">Bildet lagres lokalt og kan brukes i alle visninger.</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Fødselsdato</label>
                <input
                  name="birth_date"
                  type="date"
                  defaultValue={editingPerson.birth_date || ''}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm focus:ring-1 focus:ring-primary-light0 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Gateadresse</label>
                <input
                  name="streetAddress"
                  type="text"
                  defaultValue={editingPerson.streetAddress || ''}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm focus:ring-1 focus:ring-primary-light0 outline-none"
                  placeholder="Gate og husnummer"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Postnummer</label>
                  <input
                    name="postalCode"
                    type="text"
                    defaultValue={editingPerson.postalCode || ''}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm focus:ring-1 focus:ring-primary-light0 outline-none"
                    placeholder="0000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Poststed</label>
                  <input
                    name="city"
                    type="text"
                    defaultValue={editingPerson.city || ''}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm focus:ring-1 focus:ring-primary-light0 outline-none"
                    placeholder="By"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  name="is_admin"
                  type="checkbox"
                  value="true"
                  defaultChecked={editingPerson.is_admin}
                  className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary-light0"
                />
                <label className="text-sm font-medium text-slate-700">Gi administratorrettigheter</label>
              </div>
              <button type="submit" className="w-full py-2 bg-primary text-white rounded-theme font-bold text-sm shadow-sm hover:bg-primary-hover transition-all">
                Oppdater Person
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Rediger Familie Modal */}
      {editingFamily && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
          <div className="absolute inset-0" onClick={() => setEditingFamily(null)}></div>
          <div className="relative bg-white w-full max-w-md rounded-theme shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 text-left">
            <div className="px-5 py-4 border-b border-primary-light flex justify-between items-center bg-primary-light/50 shrink-0">
              <div className="flex items-center gap-3 text-primary">
                <Edit2 size={20} />
                <h3 className="font-bold">Rediger Familie</h3>
              </div>
              <button onClick={() => setEditingFamily(null)} className="p-1 hover:bg-primary-light rounded-theme transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateFamily} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Familienavn</label>
                <input
                  autoFocus
                  name="name"
                  type="text"
                  defaultValue={editingFamily.name || ''}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm font-bold focus:ring-1 focus:ring-primary-light0 outline-none"
                  placeholder="f.eks. Familien Hansen"
                />
              </div>
              <button type="submit" className="w-full py-2 bg-primary text-white rounded-theme font-bold text-sm shadow-sm hover:bg-primary-hover transition-all">
                Oppdater Familie
              </button>
            </form>
          </div>
        </div>
      )}
      
      {/* Example for one Modal styling */}
      {viewedRole && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
          <div className="absolute inset-0" onClick={() => setViewingRoleId(null)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-theme shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 text-left max-h-[90vh]">
            <div className="px-5 py-4 border-b border-primary-light flex justify-between items-center bg-primary-light/50 shrink-0">
              <div className="flex items-center gap-3 text-primary"><Library size={20} /><h3 className="font-bold">Rolleinstruks: {viewedRole.name}</h3></div>
              <button onClick={() => setViewingRoleId(null)} className="p-1 hover:bg-primary-light rounded-theme transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdateRole} className="flex-1 overflow-y-auto p-6 space-y-5">
              {isAdmin ? (
                <>
                  <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Rollenavn</label><input required name="name" defaultValue={viewedRole.name} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm font-bold focus:ring-1 focus:ring-primary-light0 outline-none" /></div>
                  <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Instrukser (én per linje)</label><textarea name="instructions" defaultValue={viewedRole.default_instructions.join('\n')} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm h-64 font-medium focus:ring-1 focus:ring-primary-light0 outline-none" /></div>
                  <button type="submit" className="w-full py-2 bg-primary text-white rounded-theme font-bold text-sm shadow-sm hover:bg-primary-hover transition-all">Oppdater Katalog</button>
                </>
              ) : (
                <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2"><ListChecks size={14}/> Sjekkliste</h4>
                    <div className="space-y-2">
                      {viewedRole.default_instructions.map((inst, i) => (
                        <div key={i} className="flex gap-3 text-sm text-slate-700 bg-slate-50 p-3 rounded-theme border border-slate-100 font-medium">
                          <div className="w-5 h-5 rounded-theme border border-primary-light shrink-0 flex items-center justify-center text-[10px] font-bold text-primary bg-white">{i+1}</div>
                          {inst}
                        </div>
                      ))}
                    </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Familievisningsmodal */}
      {viewingFamilyId && (() => {
        const viewingFamily = db.families.find(f => f.id === viewingFamilyId);
        if (!viewingFamily) return null;

        const familyMembers = (db.familyMembers || []).filter(fm => fm.family_id === viewingFamilyId);
        const parents = familyMembers
          .filter(fm => fm.role === FamilyRole.PARENT || fm.role === FamilyRole.PARTNER)
          .map(fm => ({
            member: fm,
            person: db.persons.find(p => p.id === fm.person_id)
          }))
          .filter(({ person }) => person !== undefined) as Array<{ member: FamilyMember; person: Person }>;
        
        const children = familyMembers
          .filter(fm => fm.role === FamilyRole.CHILD)
          .map(fm => ({
            member: fm,
            person: db.persons.find(p => p.id === fm.person_id)
          }))
          .filter(({ person }) => person !== undefined) as Array<{ member: FamilyMember; person: Person }>;

        const familyAddress = viewingFamily.streetAddress || viewingFamily.city ? 
          `${viewingFamily.streetAddress || ''}${viewingFamily.streetAddress && viewingFamily.postalCode ? ', ' : ''}${viewingFamily.postalCode || ''} ${viewingFamily.city || ''}`.trim() : 
          null;

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewingFamilyId(null)}>
            <div className="bg-white rounded-theme shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  {parents.length > 0 ? (
                    <div className="text-xl font-bold text-slate-900">
                      {(() => {
                        const familyLastName = parents[0] ? splitName(parents[0].person.name).lastName : '';
                        return (
                          <>
                            {parents.map(({ person }, index) => {
                              const { firstName } = splitName(person.name);
                              return (
                                <React.Fragment key={person.id}>
                                  <span className="text-slate-900">
                                    {firstName}
                                  </span>
                                  {index < parents.length - 1 ? ' og ' : ''}
                                </React.Fragment>
                              );
                            })}
                            {familyLastName && (
                              <span className="text-slate-900"> {familyLastName}</span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <h2 className="text-xl font-bold text-slate-900">{viewingFamily.name || 'Familie uten navn'}</h2>
                  )}
                  {familyAddress && !isEditingFamilyAddress && (
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin size={14} className="text-slate-400" />
                      <p className="text-sm text-slate-600">{familyAddress}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingFamily(viewingFamily);
                      }} 
                      className="p-2 hover:bg-slate-200 rounded-theme transition-colors"
                      title="Rediger familie"
                    >
                      <Edit2 size={18} className="text-slate-600" />
                    </button>
                  )}
                  <button onClick={() => setViewingFamilyId(null)} className="p-2 hover:bg-slate-200 rounded-theme transition-colors">
                    <X size={20} className="text-slate-600" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Adresse-redigering */}
                {isEditingFamilyAddress ? (
                  <form onSubmit={handleUpdateFamilyAddress} className="bg-slate-50 rounded-theme p-4 space-y-3 border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <MapPin size={16} /> Familieadresse
                      </h3>
                      <button type="button" onClick={() => setIsEditingFamilyAddress(false)} className="text-xs text-slate-500 hover:text-slate-700">
                        Avbryt
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Gateadresse</label>
                        <input
                          type="text"
                          value={editingFamilyStreetAddress}
                          onChange={(e) => setEditingFamilyStreetAddress(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-theme text-sm focus:ring-1 focus:ring-primary-light0 outline-none"
                          placeholder="Gate og husnummer"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Postnummer</label>
                        <input
                          type="text"
                          value={editingFamilyPostalCode}
                          onChange={(e) => setEditingFamilyPostalCode(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-theme text-sm focus:ring-1 focus:ring-primary-light0 outline-none"
                          placeholder="0000"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Poststed</label>
                        <input
                          type="text"
                          value={editingFamilyCity}
                          onChange={(e) => setEditingFamilyCity(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-theme text-sm focus:ring-1 focus:ring-primary-light0 outline-none"
                          placeholder="By"
                        />
                      </div>
                    </div>
                    <button type="submit" className="px-4 py-2 bg-primary text-white rounded-theme text-sm font-bold hover:bg-primary-hover transition-colors flex items-center gap-2">
                      <Save size={14} /> Lagre adresse
                    </button>
                  </form>
                ) : (
                  <div className="bg-slate-50 rounded-theme p-4 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-slate-400" />
                        <h3 className="text-sm font-bold text-slate-800">Familieadresse</h3>
                      </div>
                      {isAdmin && (
                        <button onClick={() => setIsEditingFamilyAddress(true)} className="text-xs text-primary hover:text-primary-hover font-medium flex items-center gap-1">
                          <Edit2 size={12} /> Rediger
                        </button>
                      )}
                    </div>
                    {familyAddress ? (
                      <p className="text-sm text-slate-600 mt-2">{familyAddress}</p>
                    ) : (
                      <p className="text-sm text-slate-400 mt-2 italic">Ingen adresse registrert</p>
                    )}
                  </div>
                )}

                {/* Foreldre/Ektefeller */}
                {parents.length > 0 && (
                  <section>
                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Users size={16} className="text-primary" /> Foreldre/Ektefeller
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {parents.map(({ member, person }) => (
                        <div 
                          key={member.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onViewPerson) {
                              onViewPerson(person.id);
                            } else {
                              setSelectedPersonId(person.id);
                            }
                          }}
                          className="bg-white border border-slate-200 rounded-theme p-4 hover:border-primary-light hover:shadow-md transition-all cursor-pointer group"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2 flex-1">
                              <img 
                                src={getAvatarUrl(person)}
                                alt={`${person.name} avatar`}
                                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                                className="border border-slate-200"
                              />
                              {member.role === FamilyRole.PARENT ? (
                                <User size={18} className="text-primary-light0" />
                              ) : (
                                <Heart size={18} className="text-rose-500" />
                              )}
                              <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors">
                                {person.name}
                              </h4>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              {member.role === FamilyRole.PARENT ? 'Forelder' : 'Partner'}
                            </span>
                          </div>
                          {person.phone && (
                            <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                              <Phone size={12} className="text-slate-400" />
                              {person.phone}
                            </div>
                          )}
                          {person.email && (
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <Mail size={12} className="text-slate-400" />
                              {person.email}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Barn */}
                {children.length > 0 && (
                  <section>
                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Baby size={16} className="text-primary-light0" /> Barn
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {children.map(({ member, person }) => {
                        const age = calculateAge(person.birth_date);
                        const hasOtherFamilies = (db.familyMembers || []).filter(
                          fm => fm.person_id === person.id && fm.family_id !== viewingFamilyId
                        ).length > 0;
                        
                        return (
                          <div 
                            key={member.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onViewPerson) {
                                onViewPerson(person.id);
                              } else {
                                setSelectedPersonId(person.id);
                              }
                            }}
                            className="bg-white border border-slate-200 rounded-theme p-4 hover:border-primary-light hover:shadow-md transition-all cursor-pointer group"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2 flex-1">
                                <img 
                                  src={getAvatarUrl(person)}
                                  alt={`${person.name} avatar`}
                                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                                  className="border border-slate-200"
                                />
                                <Baby size={16} className="text-primary-light" />
                                <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors">
                                  {person.name}
                                </h4>
                              </div>
                            </div>
                            {age && (
                              <p className="text-xs text-slate-500 mb-2">{age}</p>
                            )}
                            {hasOtherFamilies && (
                              <div className="flex items-center gap-1 text-xs text-amber-600 mb-2">
                                <Home size={12} />
                                {member.isPrimaryResidence ? 'Hovedadresse' : 'Delt bosted'}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Tom familie */}
                {familyMembers.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-sm mb-2">Ingen medlemmer registrert i denne familien ennå.</p>
                    {isAdmin && (
                      <button 
                        onClick={() => {
                          setSelectedFamilyForMember(viewingFamilyId);
                          setIsAddMemberModalOpen(true);
                        }}
                        className="px-4 py-2 bg-primary text-white rounded-theme text-sm font-bold hover:bg-primary-hover transition-colors flex items-center gap-2 mx-auto mt-4"
                      >
                        <UserPlus size={14} /> Legg til første medlem
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              {isAdmin && familyMembers.length > 0 && (
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                  <button 
                    onClick={() => {
                      setSelectedFamilyForMember(viewingFamilyId);
                      setIsAddMemberModalOpen(true);
                    }}
                    className="w-full px-4 py-2 bg-primary text-white rounded-theme text-sm font-bold hover:bg-primary-hover transition-colors flex items-center justify-center gap-2"
                  >
                    <UserPlus size={16} /> Legg til medlem
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Slett gruppe bekreftelsesdialog */}
      {isDeletingGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4" onClick={() => setIsDeletingGroup(null)}>
          <div className="bg-white rounded-theme shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Slett gruppe?</h3>
            <p className="text-sm text-slate-600 mb-6">Er du sikker på at du vil slette denne gruppen? Denne handlingen kan ikke angres.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setIsDeletingGroup(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-theme transition-colors">Avbryt</button>
              <button onClick={() => handleDeleteGroup(isDeletingGroup)} className="px-4 py-2 bg-rose-600 text-white rounded-theme hover:bg-rose-700 transition-colors">Slett</button>
            </div>
          </div>
        </div>
      )}

      {/* Opprett Gruppe Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4 overflow-y-auto" onClick={() => {
          setIsCreateModalOpen(false);
          setNewGroupCategory('');
        }}>
          <div className="bg-white rounded-theme shadow-xl max-w-4xl w-full my-8 flex flex-col max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-slate-900">Opprett Ny Gruppe</h2>
              <button onClick={() => {
                setIsCreateModalOpen(false);
                setNewGroupCategory('');
              }} className="p-2 hover:bg-slate-200 rounded-theme transition-colors">
                <X size={20} className="text-slate-600" />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Grunnleggende informasjon */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">Grunnleggende informasjon</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gruppenavn *</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-theme focus:ring-1 focus:ring-primary-light0 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type gruppe *</label>
                  <select
                    value={newGroupCategory || ''}
                    onChange={(e) => setNewGroupCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-theme focus:ring-1 focus:ring-primary-light0 outline-none"
                    required
                  >
                    <option value="" disabled>Velg kategori</option>
                    {orderedStandardCategories.map(category => (
                      <option key={category} value={category}>
                        {standardCategoryLabels[category]}
                      </option>
                    ))}
                    {customGroupTags.length > 0 && (
                      <optgroup label="Egendefinerte">
                        {customGroupTags.map(tag => (
                          <option key={tag} value={tag}>{tag}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Beskrivelse</label>
                  <textarea
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-theme focus:ring-1 focus:ring-primary-light0 outline-none"
                    placeholder="Beskriv gruppens formål og aktiviteter..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Link (f.eks. Google Disk)</label>
                  <input
                    type="url"
                    value={newGroupLink}
                    onChange={(e) => setNewGroupLink(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-theme focus:ring-1 focus:ring-primary-light0 outline-none"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Farge</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={newGroupColor}
                      onChange={(e) => setNewGroupColor(e.target.value)}
                      className="h-10 w-14 border border-slate-200 rounded-theme"
                      aria-label="Velg farge"
                    />
                    <input
                      type="text"
                      value={newGroupColor}
                      onChange={(e) => setNewGroupColor(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-theme focus:ring-1 focus:ring-primary-light0 outline-none"
                      placeholder="#2563eb"
                    />
                  </div>
                </div>
              </div>

              {/* Planlegging */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">Planlegging</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Frekvens</label>
                    <select
                      value={newGroupFrequency}
                      onChange={(e) => setNewGroupFrequency(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-theme focus:ring-1 focus:ring-primary-light0 outline-none"
                    >
                      <option value={0}>Ingen planlagt</option>
                      <option value={1}>1 gang pr uke</option>
                      <option value={2}>1 gang pr 2 uker</option>
                      <option value={3}>1 gang pr 3 uker</option>
                      <option value={4}>1 gang pr 4 uker</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Startdato</label>
                    <input
                      type="date"
                      value={newGroupStartDate}
                      onChange={(e) => setNewGroupStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-theme focus:ring-1 focus:ring-primary-light0 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ukedag</label>
                    <div className="w-full px-3 py-2 border border-slate-200 rounded-theme bg-slate-50 text-slate-700">
                      {['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'][getDayOfWeek(newGroupStartDate)]}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Klokkeslett</label>
                    <input
                      type="time"
                      value={newGroupStartTime}
                      onChange={(e) => setNewGroupStartTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-theme focus:ring-1 focus:ring-primary-light0 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Sluttid</label>
                    <input
                      type="time"
                      value={newGroupEndTime}
                      onChange={(e) => setNewGroupEndTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-theme focus:ring-1 focus:ring-primary-light0 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Sluttdato</label>
                    <input
                      type="date"
                      value={newGroupEndDate}
                      onChange={(e) => setNewGroupEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-theme focus:ring-1 focus:ring-primary-light0 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Medlemmer */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">Medlemmer</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gruppeleder</label>
                  <select
                    value={newGroupLeaderId || ''}
                    onChange={(e) => setNewGroupLeaderId(e.target.value || null)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-theme focus:ring-1 focus:ring-primary-light0 outline-none"
                  >
                    <option value="">Ingen leder valgt</option>
                    {db.persons.map(person => (
                      <option key={person.id} value={person.id}>{person.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Medlemmer</label>
                  <div className="space-y-3">
                    {/* Søkefelt for å legge til medlemmer */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="text"
                        value={newGroupMemberSearch}
                        onChange={(e) => setNewGroupMemberSearch(e.target.value)}
                        placeholder="Søk og legg til person..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-theme focus:ring-1 focus:ring-primary-light0 outline-none text-sm"
                      />
                      {newGroupMemberSearch && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-theme shadow-lg max-h-60 overflow-y-auto">
                          {db.persons
                            .filter(p => 
                              p.name.toLowerCase().includes(newGroupMemberSearch.toLowerCase()) &&
                              !newGroupMemberIds.includes(p.id) &&
                              p.id !== newGroupLeaderId
                            )
                            .slice(0, 10)
                            .map(person => (
                              <button
                                key={person.id}
                                type="button"
                                onClick={() => {
                                  setNewGroupMemberIds([...newGroupMemberIds, person.id]);
                                  setNewGroupMemberSearch('');
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-3"
                              >
                                <img 
                                  src={getAvatarUrl(person)}
                                  alt={`${person.name} avatar`}
                                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                                  className="border border-slate-200"
                                />
                                <span className="text-sm text-slate-900">{person.name}</span>
                              </button>
                            ))}
                          {db.persons.filter(p => 
                            p.name.toLowerCase().includes(newGroupMemberSearch.toLowerCase()) &&
                            !newGroupMemberIds.includes(p.id) &&
                            p.id !== newGroupLeaderId
                          ).length === 0 && (
                            <div className="px-4 py-2 text-sm text-slate-500 text-center">
                              Ingen personer funnet
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Liste over valgte medlemmer */}
                    {newGroupMemberIds.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {newGroupMemberIds.map(personId => {
                          const person = db.persons.find(p => p.id === personId);
                          if (!person) return null;
                          return (
                            <div
                              key={personId}
                              className="flex items-center gap-2 px-3 py-1.5 bg-primary-light border border-primary-light rounded-theme text-sm"
                            >
                              <span className="text-indigo-900 font-medium">{person.name}</span>
                              <button
                                type="button"
                                onClick={() => setNewGroupMemberIds(newGroupMemberIds.filter(id => id !== personId))}
                                className="text-primary hover:text-indigo-800"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 shrink-0">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-theme transition-colors">Avbryt</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-theme hover:bg-primary-hover transition-colors">Opprett Gruppe</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vis Gruppe Modal (Fullskjerm) */}
      {viewingGroupId && viewedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4" onClick={() => setViewingGroupId(null)}>
          <div className="bg-white rounded-theme shadow-xl w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {getIcon(viewedGroup.category)}
                <h2 className="text-xl font-bold text-slate-900">{viewedGroup.name}</h2>
              </div>
              <div className="flex items-center gap-2">
                {canManageGroup(viewingGroupId) && (
                  <>
                    <button onClick={() => { setManageGroupId(viewingGroupId); setViewingGroupId(null); }} className="p-2 hover:bg-slate-200 rounded-theme transition-colors" title="Rediger">
                      <Edit2 size={20} className="text-slate-600" />
                    </button>
                    {isAdmin && (
                      <button onClick={() => { setIsDeletingGroup(viewingGroupId); setViewingGroupId(null); }} className="p-2 hover:bg-slate-200 rounded-theme transition-colors" title="Slett">
                        <Trash2 size={20} className="text-slate-600" />
                      </button>
                    )}
                  </>
                )}
                <button onClick={() => setViewingGroupId(null)} className="p-2 hover:bg-slate-200 rounded-theme transition-colors">
                  <X size={20} className="text-slate-600" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Venstre kolonne */}
              <div className="space-y-6">
                {/* Beskrivelse */}
                {viewedGroup.description && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-2">Beskrivelse</h3>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{viewedGroup.description}</p>
                  </div>
                )}

                {/* Link */}
                {viewedGroup.link && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-2">Link</h3>
                    <a href={viewedGroup.link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-2">
                      <ExternalLink size={14} />
                      {viewedGroup.link}
                    </a>
                  </div>
                )}

                {/* Planlegging */}
                {viewedGroup.gathering_pattern && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-2">Planlegging</h3>
                    <div className="space-y-1 text-sm text-slate-600">
                      <p>Ukedag: {['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'][viewedGroup.gathering_pattern.day_of_week]}</p>
                      <p>Frekvens: {viewedGroup.gathering_pattern.interval === 1 ? '1 gang pr uke' : `${viewedGroup.gathering_pattern.interval} uker`}</p>
                      <p>Startdato: {new Date(viewedGroup.gathering_pattern.start_date).toLocaleDateString('no-NO')}</p>
                      {viewedGroup.gathering_pattern.time && <p>Klokkeslett: {viewedGroup.gathering_pattern.time}</p>}
                      {viewedGroup.gathering_pattern.end_time && <p>Sluttid: {viewedGroup.gathering_pattern.end_time}</p>}
                      {viewedGroup.gathering_pattern.end_date && (
                        <p>Sluttdato: {new Date(viewedGroup.gathering_pattern.end_date).toLocaleDateString('no-NO')}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Høyre kolonne */}
              <div className="space-y-6">
                {/* Leder */}
                {(() => {
                  const leader = db.groupMembers.find(gm => gm.group_id === viewingGroupId && gm.role === GroupRole.LEADER);
                  const leaderPerson = leader ? db.persons.find(p => p.id === leader.person_id) : null;
                  return leaderPerson && (
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 mb-2">Gruppeleder</h3>
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onViewPerson) {
                            onViewPerson(leaderPerson.id);
                          } else {
                            setSelectedPersonId(leaderPerson.id);
                          }
                        }}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-theme hover:bg-slate-100 hover:border-primary-light border border-transparent transition-all cursor-pointer group"
                      >
                        <img 
                          src={getAvatarUrl(leaderPerson)}
                          alt={`${leaderPerson.name} avatar`}
                          style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                          className="border border-primary-light"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 group-hover:text-primary transition-colors">{leaderPerson.name}</p>
                          {leaderPerson.email && <p className="text-xs text-slate-500">{leaderPerson.email}</p>}
                          {leaderPerson.phone && <p className="text-xs text-slate-500">{leaderPerson.phone}</p>}
                        </div>
                        <Star size={16} className="text-amber-500 fill-amber-500 ml-auto" />
                      </div>
                    </div>
                  );
                })()}

                {/* Nestleder */}
                {(() => {
                  const deputyLeaders = db.groupMembers
                    .filter(gm => gm.group_id === viewingGroupId && gm.role === GroupRole.DEPUTY_LEADER)
                    .map(gm => db.persons.find(p => p.id === gm.person_id))
                    .filter(Boolean) as Person[];
                  
                  return deputyLeaders.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 mb-2">Nestleder{deputyLeaders.length > 1 ? 'e' : ''}</h3>
                      <div className="space-y-2">
                        {deputyLeaders.map(person => (
                          <div 
                            key={person.id} 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onViewPerson) {
                                onViewPerson(person.id);
                              } else {
                                setSelectedPersonId(person.id);
                              }
                            }}
                            className="flex items-center gap-3 p-3 bg-blue-50 rounded-theme border border-blue-200 hover:bg-blue-100 hover:border-blue-400 transition-all cursor-pointer group"
                          >
                            <img 
                              src={getAvatarUrl(person)}
                              alt={`${person.name} avatar`}
                              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                              className="border border-blue-200"
                            />
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900 group-hover:text-primary transition-colors">{person.name}</p>
                              {person.email && <p className="text-xs text-slate-500">{person.email}</p>}
                              {person.phone && <p className="text-xs text-slate-500">{person.phone}</p>}
                            </div>
                            <Star size={16} className="text-blue-500 fill-blue-500 ml-auto" />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Medlemmer */}
                {(() => {
                  const members = db.groupMembers
                    .filter(gm => gm.group_id === viewingGroupId && gm.role === GroupRole.MEMBER)
                    .map(gm => db.persons.find(p => p.id === gm.person_id))
                    .filter(Boolean) as Person[];
                  
                  return members.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 mb-2">Medlemmer ({members.length})</h3>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {members.map(person => (
                          <div 
                            key={person.id} 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onViewPerson) {
                                onViewPerson(person.id);
                              } else {
                                setSelectedPersonId(person.id);
                              }
                            }}
                            className="flex items-center gap-3 p-2 bg-slate-50 rounded-theme hover:bg-slate-100 hover:border-primary-light border border-transparent transition-all cursor-pointer group"
                          >
                            <img 
                              src={getAvatarUrl(person)}
                              alt={`${person.name} avatar`}
                              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                              className="border border-slate-200"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900 group-hover:text-primary transition-colors">{person.name}</p>
                              {person.email && <p className="text-xs text-slate-500">{person.email}</p>}
                              {person.phone && <p className="text-xs text-slate-500">{person.phone}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rediger Gruppe Modal */}
      {manageGroupId && managedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4" onClick={() => setManageGroupId(null)}>
          <div className="bg-white rounded-theme shadow-xl w-full max-w-6xl h-full max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {getIcon(managedGroup.category)}
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Administrer {managedGroup.name}</h2>
                  <p className="text-xs text-slate-500 uppercase font-semibold">KONFIGURASJON & TEAM</p>
                </div>
              </div>
              <button onClick={() => setManageGroupId(null)} className="p-2 hover:bg-slate-200 rounded-theme transition-colors">
                <X size={20} className="text-slate-600" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex">
              {/* Venstre kolonne - GRUNNINFO */}
              <div className="w-1/2 border-r border-slate-200 overflow-y-auto p-6 space-y-6">
                <h3 className="text-sm font-bold text-slate-800 uppercase mb-4">GRUNNINFO</h3>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Gruppenavn</label>
                  <input
                    type="text"
                    value={editingGroupName}
                    onChange={(e) => setEditingGroupName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-theme focus:ring-1 focus:ring-primary-light0 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Kategori</label>
                  <select
                    value={editingGroupCategory}
                    onChange={(e) => setEditingGroupCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-theme focus:ring-1 focus:ring-primary-light0 outline-none text-sm"
                  >
                    {orderedStandardCategories.map(category => (
                      <option key={category} value={category}>
                        {standardCategoryLabels[category]}
                      </option>
                    ))}
                    {!isStandardCategoryValue(editingGroupCategory) &&
                      editingGroupCategory &&
                      !customGroupTags.includes(editingGroupCategory) && (
                        <option value={editingGroupCategory}>{editingGroupCategory}</option>
                      )}
                    {customGroupTags.length > 0 && (
                      <optgroup label="Egendefinerte">
                        {customGroupTags.map(tag => (
                          <option key={tag} value={tag}>{tag}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Beskrivelse</label>
                  <textarea
                    value={editingGroupDescription}
                    onChange={(e) => setEditingGroupDescription(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-slate-200 rounded-theme focus:ring-1 focus:ring-primary-light0 outline-none text-sm resize-none"
                    placeholder="Beskriv gruppens formål og aktiviteter..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1 flex items-center gap-2">
                    <LinkIcon size={14} />
                    Lenke / URL (Facebook e.l.)
                  </label>
                  <input
                    type="url"
                    value={editingGroupLink}
                    onChange={(e) => setEditingGroupLink(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-theme focus:ring-1 focus:ring-primary-light0 outline-none text-sm"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Farge</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={editingGroupColor}
                      onChange={(e) => setEditingGroupColor(e.target.value)}
                      className="h-10 w-14 border border-slate-200 rounded-theme"
                      aria-label="Velg farge"
                    />
                    <input
                      type="text"
                      value={editingGroupColor}
                      onChange={(e) => setEditingGroupColor(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-theme focus:ring-1 focus:ring-primary-light0 outline-none text-sm"
                      placeholder="#2563eb"
                    />
                  </div>
                </div>

                {/* Samlingsplanlegging - Expandable */}
                <div ref={gatheringSectionRef} className="border border-slate-200 rounded-theme overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsGatheringPatternExpanded(!isGatheringPatternExpanded)}
                    className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Repeat size={16} className="text-slate-600" />
                      <span className="text-sm font-semibold text-slate-800">SAMLINGSPLANLEGGING</span>
                    </div>
                    <ChevronDown size={16} className={`text-slate-600 transition-transform ${isGatheringPatternExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isGatheringPatternExpanded && tempPattern && (
                    <div className="p-4 space-y-4 border-t border-slate-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Frekvens</label>
                          <select
                            value={tempPattern.interval}
                            onChange={(e) => handleUpdateGatheringPattern({ interval: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-theme focus:ring-1 focus:ring-primary-light0 outline-none text-sm"
                          >
                            <option value={1}>1 gang pr uke</option>
                            <option value={2}>1 gang pr 2 uker</option>
                            <option value={3}>1 gang pr 3 uker</option>
                            <option value={4}>1 gang pr 4 uker</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Ukedag</label>
                          <div className="w-full px-3 py-2 border border-slate-200 rounded-theme text-sm bg-slate-50 text-slate-700">
                            {['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'][tempPattern.day_of_week]}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Startdato</label>
                          <input
                            type="date"
                            value={tempPattern.start_date}
                            onChange={(e) => handleUpdateGatheringPattern({ start_date: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-theme focus:ring-1 focus:ring-primary-light0 outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Sluttdato</label>
                          <input
                            type="date"
                            value={tempPattern.end_date || ''}
                            onChange={(e) => handleUpdateGatheringPattern({ end_date: e.target.value || undefined })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-theme focus:ring-1 focus:ring-primary-light0 outline-none text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Klokkeslett</label>
                          <input
                            type="time"
                            value={tempPattern.time || ''}
                            onChange={(e) => handleUpdateGatheringPattern({ time: e.target.value || undefined })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-theme focus:ring-1 focus:ring-primary-light0 outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Sluttid</label>
                          <input
                            type="time"
                            value={tempPattern.end_time || ''}
                            onChange={(e) => handleUpdateGatheringPattern({ end_time: e.target.value || undefined })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-theme focus:ring-1 focus:ring-primary-light0 outline-none text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Høyre kolonne - MEDLEMMER & TJENESTER */}
              <div className="w-1/2 overflow-y-auto p-6 space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase">MEDLEMMER & TJENESTER</h3>
                  {(() => {
                    const groupMembers = db.groupMembers.filter(gm => gm.group_id === manageGroupId);
                    return <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">{groupMembers.length} totalt</span>;
                  })()}
                </div>

                {/* Søk og legg til person */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={memberSearchForGroup}
                    onChange={(e) => setMemberSearchForGroup(e.target.value)}
                    placeholder="Søk og legg til person..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-theme focus:ring-1 focus:ring-primary-light0 outline-none text-sm"
                  />
                  {memberSearchForGroup && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-theme shadow-lg max-h-60 overflow-y-auto">
                      {db.persons
                        .filter(p => 
                          p.name.toLowerCase().includes(memberSearchForGroup.toLowerCase()) &&
                          !db.groupMembers.some(gm => gm.group_id === manageGroupId && gm.person_id === p.id)
                        )
                        .map(person => (
                          <button
                            key={person.id}
                            type="button"
                            onClick={() => {
                              handleAddMember(person.id);
                              setMemberSearchForGroup('');
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-3"
                          >
                            <img 
                              src={getAvatarUrl(person)}
                              alt={`${person.name} avatar`}
                              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                              className="border border-slate-200"
                            />
                            <span className="text-sm text-slate-900">{person.name}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                {/* Medlemsliste */}
                <div className="space-y-2">
                  {db.groupMembers
                    .filter(gm => gm.group_id === manageGroupId)
                    .map(gm => {
                      const person = db.persons.find(p => p.id === gm.person_id);
                      if (!person) return null;
                      
                      const isLeader = gm.role === GroupRole.LEADER;
                      const isDeputyLeader = gm.role === GroupRole.DEPUTY_LEADER;
                      const serviceRole = gm.service_role_id ? db.serviceRoles.find(sr => sr.id === gm.service_role_id) : null;
                      
                      return (
                        <div 
                          key={gm.id} 
                          onClick={(e) => {
                            // Stopp propagering hvis brukeren klikker på knapper eller select
                            if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('select')) {
                              return;
                            }
                            e.stopPropagation();
                            if (onViewPerson) {
                              onViewPerson(person.id);
                            } else {
                              setSelectedPersonId(person.id);
                            }
                          }}
                          className={`p-3 rounded-theme border-2 cursor-pointer group transition-all ${
                            isLeader ? 'border-amber-300 bg-amber-50 hover:bg-amber-100 hover:border-amber-400' : 
                            isDeputyLeader ? 'border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400' : 
                            'border-slate-200 bg-white hover:bg-slate-50 hover:border-primary-light'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <img 
                              src={getAvatarUrl(person)}
                              alt={`${person.name} avatar`}
                              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                              className={isLeader ? 'border border-amber-300' : isDeputyLeader ? 'border border-blue-300' : 'border border-slate-200'}
                            />
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900 group-hover:text-primary transition-colors">{person.name}</p>
                              {person.email && <p className="text-xs text-slate-500">{person.email}</p>}
                              {person.phone && <p className="text-xs text-slate-500">{person.phone}</p>}
                            </div>
                            {isLeader && (
                              <span className="flex items-center gap-1 px-2 py-1 bg-amber-200 text-amber-800 rounded text-xs font-bold uppercase">
                                <Star size={12} className="fill-amber-800" />
                                GRUPPELEDER
                              </span>
                            )}
                            {isDeputyLeader && (
                              <span className="flex items-center gap-1 px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs font-bold uppercase">
                                <Star size={12} className="fill-blue-800" />
                                NESTLEDER
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(gm.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <select
                              value={gm.service_role_id || ''}
                              onChange={(e) => handleUpdateMemberRole(gm.id, e.target.value || null)}
                              className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-primary-light0 outline-none"
                            >
                              <option value="">Tildel tjeneste-rolle...</option>
                              {db.serviceRoles.map(sr => (
                                <option key={sr.id} value={sr.id}>{sr.name}</option>
                              ))}
                            </select>
                            <select
                              value={gm.role}
                              onChange={(e) => handleSetMemberRole(gm.id, e.target.value as GroupRole)}
                              className="px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-primary-light0 outline-none"
                            >
                              <option value={GroupRole.MEMBER}>Medlem</option>
                              <option value={GroupRole.DEPUTY_LEADER}>Nestleder</option>
                              <option value={GroupRole.LEADER}>Leder</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
              <button
                onClick={handleSaveGroupChanges}
                className="px-6 py-2 bg-slate-900 text-white rounded-theme hover:bg-slate-800 transition-colors font-semibold"
              >
                Lukk & Ferdig
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupsView;
