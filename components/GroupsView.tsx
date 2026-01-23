
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppState, Group, GroupCategory, GroupRole, GroupMember, ServiceRole, UUID, Person, CoreRole, GatheringPattern, OccurrenceStatus, EventOccurrence, Assignment, Family, FamilyMember, FamilyRole } from '../types';
import { saveImageLibraryEntry, removeImageLibraryEntry } from '../db';
import { Users, Shield, Heart, Plus, X, Search, Edit2, Star, Library, ChevronDown, Calendar, Repeat, ShieldCheck, Link as LinkIcon, ExternalLink, ListChecks, Mail, Phone, ArrowLeft, Clock, CheckCircle2, ChevronRight, User, Trash2, FileText, Info, UserPlus, MapPin, Home, Save, Baby } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'persons' | 'families' | 'barnekirke' | 'fellowship' | 'service' | 'leadership' | 'roles'>('persons');
  const isScopedLeader = !isAdmin && userLeaderGroups.length > 0;
  const scopedTabs: Array<'barnekirke' | 'fellowship' | 'service' | 'leadership'> = ['barnekirke', 'fellowship', 'service', 'leadership'];
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
  const [newGroupCategory, setNewGroupCategory] = useState<GroupCategory>(GroupCategory.BARNKIRKE);
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupLink, setNewGroupLink] = useState('');
  const [newGroupLeaderId, setNewGroupLeaderId] = useState<UUID | null>(null);
  const [newGroupMemberIds, setNewGroupMemberIds] = useState<UUID[]>([]);
  const [newGroupFrequency, setNewGroupFrequency] = useState<number>(1);
  const [newGroupStartDate, setNewGroupStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newGroupStartTime, setNewGroupStartTime] = useState<string>('');
  const [newGroupEndDate, setNewGroupEndDate] = useState<string>('');
  const [isDeletingGroup, setIsDeletingGroup] = useState<UUID | null>(null);
  const [isAddingMemberToGroup, setIsAddingMemberToGroup] = useState(false);
  const [memberSearchForGroup, setMemberSearchForGroup] = useState('');
  const [newGroupMemberSearch, setNewGroupMemberSearch] = useState('');
  
  // Redigeringsstates for gruppe
  const [editingGroupName, setEditingGroupName] = useState('');
  const [editingGroupDescription, setEditingGroupDescription] = useState('');
  const [editingGroupLink, setEditingGroupLink] = useState('');
  const [isGatheringPatternExpanded, setIsGatheringPatternExpanded] = useState(false);

  // Search States
  const [memberSearch, setMemberSearch] = useState('');
  const [personSearch, setPersonSearch] = useState('');
  const [roleSearch, setRoleSearch] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<Set<'Administrator' | 'Gruppeleder' | 'Nestleder' | 'Medlem'>>(new Set());
  const [selectedBirthYears, setSelectedBirthYears] = useState<Set<number>>(new Set());
  const [isAccessLevelDropdownOpen, setIsAccessLevelDropdownOpen] = useState(false);
  const [isBirthYearDropdownOpen, setIsBirthYearDropdownOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<'name' | 'role' | 'birthDate' | 'address' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredGroups = useMemo(() => {
    let groups = db.groups;
    
    // Scoped Access: Hvis brukeren ikke er admin, vis kun grupper de leder
    if (!isAdmin && userLeaderGroups.length > 0) {
      groups = groups.filter(g => userLeaderGroups.includes(g.id));
    }
    
    if (activeTab === 'barnekirke') return groups.filter(g => g.category === GroupCategory.BARNKIRKE);
    if (activeTab === 'service') return groups.filter(g => g.category === GroupCategory.SERVICE);
    if (activeTab === 'fellowship') return groups.filter(g => g.category === GroupCategory.FELLOWSHIP);
    if (activeTab === 'leadership') return groups.filter(g => g.category === GroupCategory.STRATEGY);
    return [];
  }, [db.groups, activeTab, isAdmin, userLeaderGroups]);
  const managedGroup = db.groups.find(g => g.id === manageGroupId);
  const viewedGroup = db.groups.find(g => g.id === viewingGroupId);
  const viewedRole = db.serviceRoles.find(r => r.id === viewingRoleId);
  const selectedPerson = db.persons.find(p => p.id === selectedPersonId);

  useEffect(() => {
    if (!initialViewGroupId) return;
    setViewingGroupId(initialViewGroupId);
    const group = db.groups.find(g => g.id === initialViewGroupId);
    if (group && isScopedLeader) {
      if (group.category === GroupCategory.BARNKIRKE) setActiveTab('barnekirke');
      if (group.category === GroupCategory.FELLOWSHIP) setActiveTab('fellowship');
      if (group.category === GroupCategory.SERVICE) setActiveTab('service');
      if (group.category === GroupCategory.STRATEGY) setActiveTab('leadership');
    }
  }, [initialViewGroupId, db.groups, isScopedLeader]);

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
    if (!scopedTabs.includes(activeTab as any)) {
      setActiveTab(scopedTabs[0]);
    }
  }, [activeTab, isScopedLeader, scopedTabs]);

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
        setEditingGroupDescription(group.description || '');
        setEditingGroupLink(group.link || '');
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
      setEditingGroupDescription('');
      setEditingGroupLink('');
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

  const getIcon = (cat: GroupCategory) => {
    switch (cat) {
      case GroupCategory.BARNKIRKE: return <Baby className="text-slate-500" size={18} />;
      case GroupCategory.SERVICE: return <Shield className="text-slate-500" size={18} />;
      case GroupCategory.FELLOWSHIP: return <Heart className="text-slate-500" size={18} />;
      case GroupCategory.STRATEGY: return <Users className="text-slate-500" size={18} />;
    }
  };

  const getDayOfWeek = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).getDay();
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

  const handleSyncToCalendar = () => {
    if (!managedGroup || !tempPattern) return;
    const newOccurrences: EventOccurrence[] = [];
    let current = new Date(tempPattern.start_date);
    const endDate = tempPattern.end_date ? new Date(tempPattern.end_date) : null;
    let iterations = 0;
    while (true) {
      const dateStr = current.toISOString().split('T')[0];
      const exists = db.eventOccurrences.some(o => o.date === dateStr && o.title_override === managedGroup.name);
      if (!exists) {
        newOccurrences.push({
          id: crypto.randomUUID(),
          template_id: null,
          date: dateStr,
          time: tempPattern.time || undefined,
          title_override: managedGroup.name,
          status: OccurrenceStatus.DRAFT
        });
      }
      iterations += 1;
      if (endDate) {
        if (current >= endDate) break;
      } else if (iterations >= syncCount) {
        break;
      }
      if (tempPattern.frequency_type === 'weeks') {
        current.setDate(current.getDate() + (tempPattern.interval * 7));
      } else {
        current.setMonth(current.getMonth() + tempPattern.interval);
      }
    }
    if (newOccurrences.length > 0) {
      setDb(prev => ({ ...prev, eventOccurrences: [...prev.eventOccurrences, ...newOccurrences] }));
      alert(`${newOccurrences.length} samlinger lagt til i kalenderen.`);
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
      description: editingGroupDescription.trim() || undefined,
      link: editingGroupLink.trim() || undefined,
      gathering_pattern: tempPattern || undefined
    };
    
    handleUpdateGroupBasicInfo(updates);
    setManageGroupId(null);
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    
    const newGroupId = crypto.randomUUID();
    const gatheringPattern: GatheringPattern | undefined = newGroupFrequency > 0 ? {
      frequency_type: 'weeks',
      interval: newGroupFrequency,
      day_of_week: getDayOfWeek(newGroupStartDate),
      start_date: newGroupStartDate,
      end_date: newGroupEndDate || undefined,
      time: newGroupStartTime || undefined
    } : undefined;
    
    const newGroup: Group = {
      id: newGroupId,
      name: newGroupName.trim(),
      category: newGroupCategory,
      description: newGroupDescription.trim() || undefined,
      link: newGroupLink.trim() || undefined,
      gathering_pattern: gatheringPattern
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
      
      return {
        ...prev,
        groups: [...prev.groups, newGroup],
        groupMembers: [...prev.groupMembers, ...newGroupMembers],
        noticeMessages: [...newNotices, ...prev.noticeMessages]
      };
    });
    
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
    setNewGroupCategory(GroupCategory.BARNKIRKE); // Reset til standard kategori
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
      case CoreRole.ADMIN: return 'bg-indigo-50 text-indigo-700 border-indigo-100';
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
      
      // Filtrer på rolle (multi-select) - bruker faktiske roller fra tabellen
      let matchesRoleFilter = true;
      if (selectedRoles.size > 0) {
        const personRole = getPersonRole(p);
        matchesRoleFilter = selectedRoles.has(personRole);
      }
      
      // Filtrer på årskull
      let matchesBirthYear = true;
      if (selectedBirthYears.size > 0) {
        if (p.birth_date) {
          const birthYear = new Date(p.birth_date).getFullYear();
          matchesBirthYear = selectedBirthYears.has(birthYear);
        } else {
          matchesBirthYear = false; // Hvis ingen fødselsdato og årskull er valgt, ekskluder
        }
      }
      
      return matchesSearch && matchesRoleFilter && matchesBirthYear;
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
  }, [db.persons, db.groupMembers, personSearch, selectedRoles, selectedBirthYears, sortColumn, sortDirection, getPersonRole]);
  
  const filteredRoles = db.serviceRoles.filter(sr => sr.name.toLowerCase().includes(roleSearch.toLowerCase())).sort((a,b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-20 md:pb-8 animate-in fade-in duration-300 text-left">
      {/* Precision Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{isScopedLeader ? 'Mine grupper' : 'Folk'}</h2>
          <p className="text-sm text-slate-500">{isScopedLeader ? 'Oversikt over grupper du leder eller er nestleder for.' : 'Administrasjon av personer, familier, grupper og roller.'}</p>
        </div>
        <div className="inline-flex bg-slate-200/60 p-1 rounded-lg flex-wrap gap-1">
          {(isScopedLeader
            ? (['barnekirke', 'fellowship', 'service', 'leadership'] as const)
            : (['persons', 'families', 'barnekirke', 'fellowship', 'service', 'leadership', 'roles'] as const)
          ).map(tab => (
            <button 
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedPersonId(null); }} 
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === tab && !selectedPersonId ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              {tab === 'persons' ? 'Personer' : tab === 'families' ? 'Familier' : tab === 'barnekirke' ? 'Barnekirke' : tab === 'fellowship' ? 'Husgrupper' : tab === 'service' ? 'Team' : tab === 'leadership' ? 'Ledelse' : 'Roller'}
            </button>
          ))}
        </div>
      </div>

      {selectedPersonId && selectedPerson ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={() => setSelectedPersonId(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-2 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedPersonId(null)} className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50 transition-all text-slate-600"><ArrowLeft size={18}/></button>
                <h3 className="text-lg font-bold text-slate-900">Medlemskort: {selectedPerson.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPerson(selectedPerson);
                    }} 
                    className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Rediger person"
                  >
                    <Edit2 size={18} className="text-slate-600" />
                  </button>
                )}
                <button onClick={() => setSelectedPersonId(null)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                  <X size={20} className="text-slate-600" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
        <div className="animate-in slide-in-from-bottom-2 duration-300 space-y-6">

           <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
             {/* Profilpanel */}
             <div className="lg:col-span-4 space-y-6">
                <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
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
                            <span className="inline-block mt-1 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-tight bg-indigo-100 text-indigo-700 border-indigo-200">
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
                      <div className="p-2 bg-slate-50 rounded-lg text-slate-400 border border-slate-100"><Mail size={16} /></div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 font-medium leading-none mb-1">E-post</p>
                        <p className="text-sm font-semibold text-slate-700 truncate">{selectedPerson.email || '–'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 rounded-lg text-slate-400 border border-slate-100"><Phone size={16} /></div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium leading-none mb-1">Telefon</p>
                        <p className="text-sm font-semibold text-slate-700">{selectedPerson.phone || '–'}</p>
                      </div>
                    </div>
                    {selectedPerson.birth_date && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 rounded-lg text-slate-400 border border-slate-100"><Calendar size={16} /></div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium leading-none mb-1">Fødselsdato</p>
                          <p className="text-sm font-semibold text-slate-700">
                            {new Intl.DateTimeFormat('no-NO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(selectedPerson.birth_date))}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
             </div>

             {/* Aktivitetspanel */}
             <div className="lg:col-span-8 space-y-6">
               <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
                      <div key={gm.id} className="p-4 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-all group">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100 border border-slate-200 shrink-0">
                            {group && getIcon(group.category)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-800 text-sm mb-2">{group?.name}</p>
                            <div className="space-y-1.5">
                              {/* Vis gruppens rolle først (hvis leder/nestleder) */}
                              {(isLeader || isDeputyLeader) && (
                                <div className="flex items-center gap-1.5">
                                  {isLeader && <Star size={12} className="text-amber-500 fill-amber-500 shrink-0" />}
                                  {isDeputyLeader && <Shield size={12} className="text-indigo-500 shrink-0" />}
                                  <p className="text-[10px] font-bold text-slate-700">
                                    {isLeader ? 'Gruppeleder' : 'Nestleder'}
                                  </p>
                                </div>
                              )}
                              {/* Vis tjenesterolle hvis den finnes */}
                              {serviceRole && (
                                <div className="flex items-center gap-1.5">
                                  <Shield size={12} className="text-indigo-500 shrink-0" />
                                  <span className="inline-flex items-center px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[9px] font-semibold">
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

               <section className="bg-slate-900 rounded-xl shadow-sm overflow-hidden">
                 <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
                   <Calendar className="text-indigo-400" size={18} />
                   <h4 className="text-sm font-bold text-white">Kommende vakter</h4>
                 </div>
                 <div className="p-3 space-y-2">
                   {personData?.upcomingAssignments.map((item, index) => {
                     const { a, occ, role, programItem } = item as any;
                     const uniqueKey = a?.id || programItem?.id || `item-${index}`;
                     
                     return (
                       <div key={uniqueKey} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 hover:border-indigo-500/50 transition-all flex items-center justify-between group">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-700 rounded-lg flex flex-col items-center justify-center text-white border border-slate-600 group-hover:border-indigo-400/30 transition-all">
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
                         <ChevronRight size={16} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
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
      ) : activeTab === 'roles' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" placeholder="Søk i roller..." value={roleSearch} onChange={e => setRoleSearch(e.target.value)} className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-indigo-500 text-sm" />
            </div>
            {isAdmin && (
              <button onClick={() => setIsCreateServiceRoleModalOpen(true)} className="px-4 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-bold hover:bg-indigo-700 shadow-sm flex items-center gap-2 transition-all"><Plus size={14} /> Ny Rolle</button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {filteredRoles.map(sr => (
              <button 
                key={sr.id} 
                onClick={() => setViewingRoleId(sr.id)}
                className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow transition-all text-left group flex flex-col justify-between h-full min-h-[90px]"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-1 bg-slate-50 rounded border border-slate-100 text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                      <Library size={12} />
                    </div>
                    {isAdmin && <Edit2 size={10} className="text-slate-300 opacity-0 group-hover:opacity-100" />}
                  </div>
                  <h4 className="font-bold text-slate-800 text-[13px] leading-tight line-clamp-2">{sr.name}</h4>
                </div>
                
                <div className="mt-2 flex items-center justify-end">
                  {sr.default_instructions.length > 0 && (
                    <div className="flex items-center gap-1 text-indigo-500" title="Instrukser tilgjengelig">
                      <ListChecks size={12} />
                      <span className="text-[9px] font-bold uppercase">Instruks</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : activeTab === 'persons' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Søk person..." value={personSearch} onChange={e => setPersonSearch(e.target.value)} className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm outline-none" />
              </div>
              {isAdmin && (
                <button onClick={() => setIsCreatePersonModalOpen(true)} className="px-4 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-bold shadow-sm flex items-center gap-2"><Plus size={14} /> Ny Person</button>
              )}
            </div>
            
            {/* Filter og Opprett gruppe fra utvalg */}
            <div className="flex flex-wrap gap-4 items-end justify-between">
              <div className="flex flex-wrap gap-4 items-end flex-1">
              {/* Tilgangskontroll-filter */}
              <div className="relative flex-1 min-w-[200px]">
                <label className="text-xs font-semibold text-slate-600 mb-2 block">Tilgangskontroll:</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsAccessLevelDropdownOpen(!isAccessLevelDropdownOpen)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-left focus:ring-1 focus:ring-indigo-500 outline-none flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-slate-700">
                      {selectedRoles.size === 0 
                        ? 'Velg rolle...' 
                        : selectedRoles.size === 1
                        ? Array.from(selectedRoles)[0]
                        : `${selectedRoles.size} roller valgt`}
                    </span>
                    <ChevronDown 
                      size={14} 
                      className={`text-slate-400 transition-transform ${isAccessLevelDropdownOpen ? 'rotate-180' : ''}`} 
                    />
                  </button>
                  {isAccessLevelDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsAccessLevelDropdownOpen(false)}
                      ></div>
                      <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        <div className="p-2 space-y-1">
                          {availableRoles.map(role => {
                            const isSelected = selectedRoles.has(role);
                            return (
                              <label
                                key={role}
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    const newSet = new Set(selectedRoles);
                                    if (isSelected) {
                                      newSet.delete(role);
                                    } else {
                                      newSet.add(role);
                                    }
                                    setSelectedRoles(newSet);
                                  }}
                                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                />
                                <span className="text-xs text-slate-700">{role}</span>
                              </label>
                            );
                          })}
                          {selectedRoles.size > 0 && (
                            <div className="border-t border-slate-200 pt-1 mt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRoles(new Set());
                                  setIsAccessLevelDropdownOpen(false);
                                }}
                                className="w-full px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded text-left"
                              >
                                Nullstill alle
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Årskull-filter */}
              {availableBirthYears.length > 0 && (
                <div className="relative flex-1 min-w-[200px]">
                  <label className="text-xs font-semibold text-slate-600 mb-2 block">Årskull:</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsBirthYearDropdownOpen(!isBirthYearDropdownOpen)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-left focus:ring-1 focus:ring-indigo-500 outline-none flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-slate-700">
                        {selectedBirthYears.size === 0 
                          ? 'Velg årskull...' 
                          : selectedBirthYears.size === 1
                          ? `${Array.from(selectedBirthYears)[0]}`
                          : `${selectedBirthYears.size} årskull valgt`}
                      </span>
                      <ChevronDown 
                        size={14} 
                        className={`text-slate-400 transition-transform ${isBirthYearDropdownOpen ? 'rotate-180' : ''}`} 
                      />
                    </button>
                    {isBirthYearDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setIsBirthYearDropdownOpen(false)}
                        ></div>
                        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          <div className="p-2 space-y-1">
                            {availableBirthYears.map(year => {
                              const isSelected = selectedBirthYears.has(year);
                              return (
                                <label
                                  key={year}
                                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {
                                      const newSet = new Set(selectedBirthYears);
                                      if (isSelected) {
                                        newSet.delete(year);
                                      } else {
                                        newSet.add(year);
                                      }
                                      setSelectedBirthYears(newSet);
                                    }}
                                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                  />
                                  <span className="text-xs text-slate-700">{year}</span>
                                </label>
                              );
                            })}
                            {selectedBirthYears.size > 0 && (
                              <div className="border-t border-slate-200 pt-1 mt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedBirthYears(new Set());
                                    setIsBirthYearDropdownOpen(false);
                                  }}
                                  className="w-full px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded text-left"
                                >
                                  Nullstill alle
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              </div>
              
              {/* Opprett gruppe fra utvalg-knapp */}
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    // Hent alle personer som er synlige i tabellen (filteredPersons)
                    const selectedPersonIds = filteredPersons.map(p => p.id);
                    setNewGroupMemberIds(selectedPersonIds);
                    setNewGroupCategory(GroupCategory.BARNKIRKE); // Sett Barnekirke som standard
                    setIsCreateModalOpen(true);
                  }}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-bold shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-2"
                  title={`Opprett gruppe med ${filteredPersons.length} personer fra utvalget`}
                >
                  <Plus size={14} />
                  Opprett gruppe fra utvalg ({filteredPersons.length})
                </button>
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
                        <span className="text-indigo-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    onClick={() => {
                      if (sortColumn === 'birthDate') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortColumn('birthDate');
                        setSortDirection('asc');
                      }
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      Født
                      {sortColumn === 'birthDate' && (
                        <span className="text-indigo-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    onClick={() => {
                      if (sortColumn === 'role') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortColumn('role');
                        setSortDirection('asc');
                      }
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      Rolle
                      {sortColumn === 'role' && (
                        <span className="text-indigo-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-4">E-post</th>
                  <th className="py-3 px-4">Telefon</th>
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
                        <span className="text-indigo-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
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
                  
                  let roleLabel = 'Medlem';
                  let roleColorClass = 'bg-slate-100 text-slate-600 border-slate-200';
                  if (person.is_admin) {
                    roleLabel = 'Administrator';
                    roleColorClass = 'bg-indigo-100 text-indigo-700 border-indigo-200';
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
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">{formattedBirthDate || '–'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-tight ${roleColorClass}`}>
                          {roleLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">{person.email || '–'}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{person.phone || '–'}</td>
                      <td className="py-3 px-4 text-xs text-slate-500 max-w-[200px] truncate" title={address || undefined}>
                        {address || '–'}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {isAdmin && (
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingPerson(person)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-100 rounded-md transition-colors"><Edit2 size={14} /></button>
                            <button onClick={() => handleDeletePerson(person.id)} className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-100 rounded-md transition-colors"><Trash2 size={14} /></button>
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
      ) : activeTab === 'families' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800">Familier</h3>
            {isAdmin && (
              <button 
                onClick={() => setIsCreateFamilyModalOpen(true)}
                className="px-4 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-bold hover:bg-indigo-700 shadow-sm flex items-center gap-2 transition-all"
              >
                <Plus size={14} /> Ny Familie
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(db.families || []).length > 0 ? (db.families || []).map(family => {
              const members = (db.familyMembers || []).filter(fm => fm.family_id === family.id);
              const address = family.streetAddress || family.city ? 
                `${family.streetAddress || ''}${family.streetAddress && family.postalCode ? ', ' : ''}${family.postalCode || ''} ${family.city || ''}`.trim() : 
                null;
              return (
                <div 
                  key={family.id}
                  onClick={() => setViewingFamilyId(family.id)}
                  className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
                >
                  <h3 className="text-sm font-bold text-slate-900 mb-2 group-hover:text-indigo-600">{family.name || 'Familie uten navn'}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{members.length} medlemmer</p>
                  {address && (
                    <p className="text-xs text-slate-500 mb-3 truncate">{address}</p>
                  )}
                  {isAdmin && (
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation();
                        setSelectedFamilyForMember(family.id); 
                        setIsAddMemberModalOpen(true); 
                      }}
                      className="w-full mt-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-md text-xs font-bold hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={12} /> Legg til medlem
                    </button>
                  )}
                </div>
              );
            }) : (
              <div className="col-span-full bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <p className="text-slate-500 text-sm text-center py-8">
                  Ingen familier registrert ennå. Klikk "Ny Familie" for å opprette en familie.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            {isAdmin && <button onClick={() => { 
              const category = activeTab === 'barnekirke' ? GroupCategory.BARNKIRKE :
                              activeTab === 'service' ? GroupCategory.SERVICE : 
                              activeTab === 'fellowship' ? GroupCategory.FELLOWSHIP : 
                              GroupCategory.STRATEGY;
              setNewGroupCategory(category);
              setIsCreateModalOpen(true);
            }} className="px-4 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-bold shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-2"><Plus size={14} /> Ny Gruppe</button>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups.map(group => {
              const members = db.groupMembers.filter(gm => gm.group_id === group.id);
              const leaderMembers = members.filter(m => m.role === GroupRole.LEADER).map(m => db.persons.find(p => p.id === m.person_id)).filter(Boolean) as Person[];
              const deputyLeaderMembers = members.filter(m => m.role === GroupRole.DEPUTY_LEADER).map(m => db.persons.find(p => p.id === m.person_id)).filter(Boolean) as Person[];
              return (
                <button 
                  key={group.id} 
                  onClick={() => setViewingGroupId(group.id)}
                  className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all group relative flex flex-col h-full text-left"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3"><div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">{getIcon(group.category)}</div><h3 className="text-sm font-bold text-slate-900">{group.name}</h3></div>
                    {canManageGroup(group.id) && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); setManageGroupId(group.id); }} className="p-1.5 text-slate-300 hover:text-indigo-600 rounded-md transition-all"><Edit2 size={14} /></button>
                        {isAdmin && (
                          <button onClick={(e) => { e.stopPropagation(); setIsDeletingGroup(group.id); }} className="p-1.5 text-slate-300 hover:text-rose-600 rounded-md transition-all"><Trash2 size={14} /></button>
                        )}
                      </div>
                    )}
                  </div>
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
            })}
          </div>
        </div>
      )}

      {/* Ny Familie Modal */}
      {isCreateFamilyModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
          <div className="absolute inset-0" onClick={() => { setIsCreateFamilyModalOpen(false); setNewFamilyName(''); }}></div>
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 text-left">
            <div className="px-5 py-4 border-b border-indigo-100 flex justify-between items-center bg-indigo-50/50 shrink-0">
              <div className="flex items-center gap-3 text-indigo-700">
                <Users size={20} />
                <h3 className="font-bold">Opprett Ny Familie</h3>
              </div>
              <button onClick={() => { setIsCreateFamilyModalOpen(false); setNewFamilyName(''); }} className="p-1 hover:bg-indigo-100 rounded-md transition-colors">
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="f.eks. Familien Hansen"
                />
              </div>
              <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-md font-bold text-sm shadow-sm hover:bg-indigo-700 transition-all">
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
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 text-left max-h-[90vh]">
            <div className="px-5 py-4 border-b border-indigo-100 flex justify-between items-center bg-indigo-50/50 shrink-0">
              <div className="flex items-center gap-3 text-indigo-700">
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
              }} className="p-1 hover:bg-indigo-100 rounded-md transition-colors">
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
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="Skriv navn for å søke eller opprett ny..."
                  />
                </div>
                
                {/* Autocomplete dropdown - vis kun hvis ingen eksakt match */}
                {memberPersonSearch && !memberPersonId && memberPersonSearch.trim().length >= 2 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border border-slate-200 rounded-md bg-white shadow-lg">
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
                          className="w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-b-0"
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
                  <div className="mt-2 p-3 bg-indigo-50 rounded-md border border-indigo-200">
                    <p className="text-xs font-bold text-indigo-700 mb-1">Valgt: {db.persons.find(p => p.id === memberPersonId)?.name}</p>
                    <p className="text-xs text-indigo-600">{db.persons.find(p => p.id === memberPersonId)?.email}</p>
                  </div>
                )}

                {/* Indikasjon for ny person */}
                {isNewPerson && !memberPersonId && memberPersonSearch.trim().length > 0 && (
                  <div className="mt-2 p-3 bg-amber-50 rounded-md border border-amber-200">
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
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
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
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
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
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
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
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
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
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="isSecondaryResidence" className="text-sm font-medium text-slate-700">
                  Dette er personens sekundæradresse (delt bosted)
                </label>
              </div>

              <button
                type="submit"
                disabled={!memberPersonSearch.trim()}
                className="w-full py-2 bg-indigo-600 text-white rounded-md font-bold text-sm shadow-sm hover:bg-indigo-700 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed"
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
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 text-left">
            <div className="px-5 py-4 border-b border-indigo-100 flex justify-between items-center bg-indigo-50/50 shrink-0">
              <div className="flex items-center gap-3 text-indigo-700">
                <Library size={20} />
                <h3 className="font-bold">Opprett Ny Rolle</h3>
              </div>
              <button onClick={() => setIsCreateServiceRoleModalOpen(false)} className="p-1 hover:bg-indigo-100 rounded-md transition-colors">
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="f.eks. Møteleder"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Instrukser (én per linje)</label>
                <textarea
                  name="instructions"
                  rows={6}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                  placeholder="1. Første instruks&#10;2. Andre instruks&#10;3. Tredje instruks"
                />
              </div>
              <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-md font-bold text-sm shadow-sm hover:bg-indigo-700 transition-all">
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
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 text-left max-h-[90vh]">
            <div className="px-5 py-4 border-b border-indigo-100 flex justify-between items-center bg-indigo-50/50 shrink-0">
              <div className="flex items-center gap-3 text-indigo-700">
                <UserPlus size={20} />
                <h3 className="font-bold">Opprett Ny Person</h3>
              </div>
              <button onClick={() => setIsCreatePersonModalOpen(false)} className="p-1 hover:bg-indigo-100 rounded-md transition-colors">
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="Fullt navn"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">E-post</label>
                <input
                  name="email"
                  type="email"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="person@eksempel.no"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Telefon</label>
                <input
                  name="phone"
                  type="tel"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">Bildet lagres lokalt og kan brukes i alle visninger.</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Fødselsdato</label>
                <input
                  name="birth_date"
                  type="date"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Gateadresse</label>
                <input
                  name="streetAddress"
                  type="text"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="Gate og husnummer"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Postnummer</label>
                  <input
                    name="postalCode"
                    type="text"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="0000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Poststed</label>
                  <input
                    name="city"
                    type="text"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="By"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  name="is_admin"
                  type="checkbox"
                  value="true"
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <label className="text-sm font-medium text-slate-700">Gi administratorrettigheter</label>
              </div>
              <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-md font-bold text-sm shadow-sm hover:bg-indigo-700 transition-all">
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
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 text-left max-h-[90vh]">
            <div className="px-5 py-4 border-b border-indigo-100 flex justify-between items-center bg-indigo-50/50 shrink-0">
              <div className="flex items-center gap-3 text-indigo-700">
                <Edit2 size={20} />
                <h3 className="font-bold">Rediger Person</h3>
              </div>
              <button onClick={() => setEditingPerson(null)} className="p-1 hover:bg-indigo-100 rounded-md transition-colors">
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">E-post</label>
                <input
                  name="email"
                  type="email"
                  defaultValue={editingPerson.email || ''}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="person@eksempel.no"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Telefon</label>
                <input
                  name="phone"
                  type="tel"
                  defaultValue={editingPerson.phone || ''}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">Bildet lagres lokalt og kan brukes i alle visninger.</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Fødselsdato</label>
                <input
                  name="birth_date"
                  type="date"
                  defaultValue={editingPerson.birth_date || ''}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Gateadresse</label>
                <input
                  name="streetAddress"
                  type="text"
                  defaultValue={editingPerson.streetAddress || ''}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="0000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Poststed</label>
                  <input
                    name="city"
                    type="text"
                    defaultValue={editingPerson.city || ''}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
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
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <label className="text-sm font-medium text-slate-700">Gi administratorrettigheter</label>
              </div>
              <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-md font-bold text-sm shadow-sm hover:bg-indigo-700 transition-all">
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
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 text-left">
            <div className="px-5 py-4 border-b border-indigo-100 flex justify-between items-center bg-indigo-50/50 shrink-0">
              <div className="flex items-center gap-3 text-indigo-700">
                <Edit2 size={20} />
                <h3 className="font-bold">Rediger Familie</h3>
              </div>
              <button onClick={() => setEditingFamily(null)} className="p-1 hover:bg-indigo-100 rounded-md transition-colors">
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="f.eks. Familien Hansen"
                />
              </div>
              <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-md font-bold text-sm shadow-sm hover:bg-indigo-700 transition-all">
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
          <div className="relative bg-white w-full max-w-lg rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 text-left max-h-[90vh]">
            <div className="px-5 py-4 border-b border-indigo-100 flex justify-between items-center bg-indigo-50/50 shrink-0">
              <div className="flex items-center gap-3 text-indigo-700"><Library size={20} /><h3 className="font-bold">Rolleinstruks: {viewedRole.name}</h3></div>
              <button onClick={() => setViewingRoleId(null)} className="p-1 hover:bg-indigo-100 rounded-md transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdateRole} className="flex-1 overflow-y-auto p-6 space-y-5">
              {isAdmin ? (
                <>
                  <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Rollenavn</label><input required name="name" defaultValue={viewedRole.name} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none" /></div>
                  <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Instrukser (én per linje)</label><textarea name="instructions" defaultValue={viewedRole.default_instructions.join('\n')} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm h-64 font-medium focus:ring-1 focus:ring-indigo-500 outline-none" /></div>
                  <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-md font-bold text-sm shadow-sm hover:bg-indigo-700 transition-all">Oppdater Katalog</button>
                </>
              ) : (
                <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2"><ListChecks size={14}/> Sjekkliste</h4>
                    <div className="space-y-2">
                      {viewedRole.default_instructions.map((inst, i) => (
                        <div key={i} className="flex gap-3 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 font-medium">
                          <div className="w-5 h-5 rounded border border-indigo-200 shrink-0 flex items-center justify-center text-[10px] font-bold text-indigo-500 bg-white">{i+1}</div>
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
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
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
                      className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                      title="Rediger familie"
                    >
                      <Edit2 size={18} className="text-slate-600" />
                    </button>
                  )}
                  <button onClick={() => setViewingFamilyId(null)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                    <X size={20} className="text-slate-600" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Adresse-redigering */}
                {isEditingFamilyAddress ? (
                  <form onSubmit={handleUpdateFamilyAddress} className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200">
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
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                          placeholder="Gate og husnummer"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Postnummer</label>
                        <input
                          type="text"
                          value={editingFamilyPostalCode}
                          onChange={(e) => setEditingFamilyPostalCode(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                          placeholder="0000"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Poststed</label>
                        <input
                          type="text"
                          value={editingFamilyCity}
                          onChange={(e) => setEditingFamilyCity(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                          placeholder="By"
                        />
                      </div>
                    </div>
                    <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2">
                      <Save size={14} /> Lagre adresse
                    </button>
                  </form>
                ) : (
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-slate-400" />
                        <h3 className="text-sm font-bold text-slate-800">Familieadresse</h3>
                      </div>
                      {isAdmin && (
                        <button onClick={() => setIsEditingFamilyAddress(true)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
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
                      <Users size={16} className="text-indigo-500" /> Foreldre/Ektefeller
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
                          className="bg-white border border-slate-200 rounded-lg p-4 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
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
                                <User size={18} className="text-indigo-500" />
                              ) : (
                                <Heart size={18} className="text-rose-500" />
                              )}
                              <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
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
                      <Baby size={16} className="text-indigo-500" /> Barn
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
                            className="bg-white border border-slate-200 rounded-lg p-4 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2 flex-1">
                                <img 
                                  src={getAvatarUrl(person)}
                                  alt={`${person.name} avatar`}
                                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                                  className="border border-slate-200"
                                />
                                <Baby size={16} className="text-indigo-400" />
                                <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
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
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 mx-auto mt-4"
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
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Slett gruppe?</h3>
            <p className="text-sm text-slate-600 mb-6">Er du sikker på at du vil slette denne gruppen? Denne handlingen kan ikke angres.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setIsDeletingGroup(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors">Avbryt</button>
              <button onClick={() => handleDeleteGroup(isDeletingGroup)} className="px-4 py-2 bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-colors">Slett</button>
            </div>
          </div>
        </div>
      )}

      {/* Opprett Gruppe Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4 overflow-y-auto" onClick={() => {
          setIsCreateModalOpen(false);
          setNewGroupCategory(GroupCategory.BARNKIRKE); // Reset til standard kategori
        }}>
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full my-8 flex flex-col max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-slate-900">Opprett Ny Gruppe</h2>
              <button onClick={() => {
                setIsCreateModalOpen(false);
                setNewGroupCategory(GroupCategory.BARNKIRKE); // Reset til standard kategori
              }} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type gruppe *</label>
                  <select
                    value={newGroupCategory}
                    onChange={(e) => setNewGroupCategory(e.target.value as GroupCategory)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    <option value={GroupCategory.BARNKIRKE}>Barnekirke</option>
                    <option value={GroupCategory.FELLOWSHIP}>Husgruppe</option>
                    <option value={GroupCategory.SERVICE}>Team</option>
                    <option value={GroupCategory.STRATEGY}>Ledelse</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Beskrivelse</label>
                  <textarea
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="Beskriv gruppens formål og aktiviteter..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Link (f.eks. Google Disk)</label>
                  <input
                    type="url"
                    value={newGroupLink}
                    onChange={(e) => setNewGroupLink(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="https://..."
                  />
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
                      className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
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
                      className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ukedag</label>
                    <div className="w-full px-3 py-2 border border-slate-200 rounded-md bg-slate-50 text-slate-700">
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
                      className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Sluttdato</label>
                    <input
                      type="date"
                      value={newGroupEndDate}
                      onChange={(e) => setNewGroupEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
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
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                      />
                      {newGroupMemberSearch && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
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
                              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-md text-sm"
                            >
                              <span className="text-indigo-900 font-medium">{person.name}</span>
                              <button
                                type="button"
                                onClick={() => setNewGroupMemberIds(newGroupMemberIds.filter(id => id !== personId))}
                                className="text-indigo-600 hover:text-indigo-800"
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
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors">Avbryt</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">Opprett Gruppe</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vis Gruppe Modal (Fullskjerm) */}
      {viewingGroupId && viewedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4" onClick={() => setViewingGroupId(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {getIcon(viewedGroup.category)}
                <h2 className="text-xl font-bold text-slate-900">{viewedGroup.name}</h2>
              </div>
              <div className="flex items-center gap-2">
                {canManageGroup(viewingGroupId) && (
                  <>
                    <button onClick={() => { setManageGroupId(viewingGroupId); setViewingGroupId(null); }} className="p-2 hover:bg-slate-200 rounded-lg transition-colors" title="Rediger">
                      <Edit2 size={20} className="text-slate-600" />
                    </button>
                    {isAdmin && (
                      <button onClick={() => { setIsDeletingGroup(viewingGroupId); setViewingGroupId(null); }} className="p-2 hover:bg-slate-200 rounded-lg transition-colors" title="Slett">
                        <Trash2 size={20} className="text-slate-600" />
                      </button>
                    )}
                  </>
                )}
                <button onClick={() => setViewingGroupId(null)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
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
                    <a href={viewedGroup.link} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline flex items-center gap-2">
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
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 hover:border-indigo-400 border border-transparent transition-all cursor-pointer group"
                      >
                        <img 
                          src={getAvatarUrl(leaderPerson)}
                          alt={`${leaderPerson.name} avatar`}
                          style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                          className="border border-indigo-200"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{leaderPerson.name}</p>
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
                            className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 hover:border-blue-400 transition-all cursor-pointer group"
                          >
                            <img 
                              src={getAvatarUrl(person)}
                              alt={`${person.name} avatar`}
                              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                              className="border border-blue-200"
                            />
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{person.name}</p>
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
                            className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 hover:border-indigo-400 border border-transparent transition-all cursor-pointer group"
                          >
                            <img 
                              src={getAvatarUrl(person)}
                              alt={`${person.name} avatar`}
                              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                              className="border border-slate-200"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">{person.name}</p>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl h-full max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {getIcon(managedGroup.category)}
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Administrer {managedGroup.name}</h2>
                  <p className="text-xs text-slate-500 uppercase font-semibold">KONFIGURASJON & TEAM</p>
                </div>
              </div>
              <button onClick={() => setManageGroupId(null)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Beskrivelse</label>
                  <textarea
                    value={editingGroupDescription}
                    onChange={(e) => setEditingGroupDescription(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none text-sm resize-none"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="https://..."
                  />
                </div>

                {/* Samlingsplanlegging - Expandable */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
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
                            className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                          >
                            <option value={1}>1 gang pr uke</option>
                            <option value={2}>1 gang pr 2 uker</option>
                            <option value={3}>1 gang pr 3 uker</option>
                            <option value={4}>1 gang pr 4 uker</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Ukedag</label>
                          <div className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-slate-50 text-slate-700">
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
                            className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Sluttdato</label>
                          <input
                            type="date"
                            value={tempPattern.end_date || ''}
                            onChange={(e) => handleUpdateGatheringPattern({ end_date: e.target.value || undefined })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Klokkeslett</label>
                        <input
                          type="time"
                          value={tempPattern.time || ''}
                          onChange={(e) => handleUpdateGatheringPattern({ time: e.target.value || undefined })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                        />
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
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                  />
                  {memberSearchForGroup && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
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
                          className={`p-3 rounded-lg border-2 cursor-pointer group transition-all ${
                            isLeader ? 'border-amber-300 bg-amber-50 hover:bg-amber-100 hover:border-amber-400' : 
                            isDeputyLeader ? 'border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400' : 
                            'border-slate-200 bg-white hover:bg-slate-50 hover:border-indigo-400'
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
                              <p className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{person.name}</p>
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
                              className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                            >
                              <option value="">Tildel tjeneste-rolle...</option>
                              {db.serviceRoles.map(sr => (
                                <option key={sr.id} value={sr.id}>{sr.name}</option>
                              ))}
                            </select>
                            <select
                              value={gm.role}
                              onChange={(e) => handleSetMemberRole(gm.id, e.target.value as GroupRole)}
                              className="px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
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
                className="px-6 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors font-semibold"
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
