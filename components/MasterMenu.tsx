
import React, { useState, useMemo } from 'react';
import { AppState, EventTemplate, EventOccurrence, ServiceRole, GroupCategory, UUID, ProgramItem, Assignment, Person, GroupRole, ChangeLog, CoreRole } from '../types';
import { Settings, Plus, Info, Edit3, Trash2, Shield, Repeat, X, Clock, Users, Edit2, Library, ListChecks, Lock, UserCheck, UserPlus, GripVertical, RefreshCw, AlertCircle, Save, Calendar } from 'lucide-react';

// Hjelpefunksjon for å parse datoer i lokal tid (Berlin time)
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Hjelpefunksjon for å formatere dato til YYYY-MM-DD i lokal tid
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface Props {
  db: AppState;
  setDb: React.Dispatch<React.SetStateAction<AppState>>;
  onCreateRecurring: (templateId: string, startDate: string, count: number, intervalDays: number) => void;
  onUpdateOccurrence: (occurrenceId: string, updates: Partial<EventOccurrence>) => void;
  onAddProgramItem: (item: ProgramItem) => void;
  onUpdateProgramItem?: (id: string, updates: Partial<ProgramItem>) => void;
  onDeleteProgramItem: (id: string) => void;
}

const MasterMenu: React.FC<Props> = ({ db, setDb, onCreateRecurring, onUpdateOccurrence, onAddProgramItem, onUpdateProgramItem, onDeleteProgramItem }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<EventTemplate | null>(db.eventTemplates[0] || null);
  
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [viewingRoleInstructionsId, setViewingRoleInstructionsId] = useState<UUID | null>(null);
  const [editingProgramItem, setEditingProgramItem] = useState<ProgramItem | null>(null);

  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateType, setNewTemplateType] = useState('Gudstjeneste');
  const [newTemplateRecurrence, setNewTemplateRecurrence] = useState('Hver søndag');
  const [newTemplateColor, setNewTemplateColor] = useState('#2563eb'); // Standard blå

  const [recStartDate, setRecStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [recStartTime, setRecStartTime] = useState<string>('');
  const [recEndDate, setRecEndDate] = useState<string>('');
  const [recFrequency, setRecFrequency] = useState<'weekly' | 'biweekly' | 'triweekly' | 'monthly'>('weekly');
  const [recWeekInterval, setRecWeekInterval] = useState<number>(1); // For uke-basert: 1, 2, 3, eller 4
  const [recMonthWeek, setRecMonthWeek] = useState<number>(1); // For månedlig: 1., 2., 3., eller 4. uke

  const [progTitle, setProgTitle] = useState('');
  const [progDuration, setProgDuration] = useState(5);
  const [progRoleId, setProgRoleId] = useState<string>('');
  const [progGroupId, setProgGroupId] = useState<string>('');
  const [progPersonId, setProgPersonId] = useState<string>('');
  const [progDescription, setProgDescription] = useState<string>('');

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // HJELPEFUNKSJON: Henter alle programposter for valgt mal sortert
  const currentTemplateProgramItems = useMemo(() => {
    if (!selectedTemplate) return [];
    return db.programItems
      .filter(p => p.template_id === selectedTemplate.id)
      .sort((a, b) => a.order - b.order);
  }, [selectedTemplate, db.programItems]);

  // LOGIKK FOR SYNKRONISERINGSSTATUS
  const isUnsynced = useMemo(() => {
    if (!selectedTemplate) return false;
    
    // 1. Finn unike [Rolle + Person] kombinasjoner i kjøreplanen
    const programCombos = new Set<string>();
    currentTemplateProgramItems.forEach(item => {
      if (item.service_role_id) {
        programCombos.add(`${item.service_role_id}-${item.person_id || 'null'}`);
      }
    });

    // 2. Finn roller i bemanningslisten som stammer fra kjøreplanen
    const programRoleIds = new Set(currentTemplateProgramItems.filter(p => p.service_role_id).map(p => p.service_role_id));
    const staffingCombos = new Set<string>();
    
    db.assignments
      .filter(a => a.template_id === selectedTemplate.id && programRoleIds.has(a.service_role_id))
      .forEach(a => {
        staffingCombos.add(`${a.service_role_id}-${a.person_id || 'null'}`);
      });

    // 3. Sammenlign settene
    if (programCombos.size !== staffingCombos.size) return true;
    for (let combo of programCombos) {
      if (!staffingCombos.has(combo)) return true;
    }
    
    return false;
  }, [currentTemplateProgramItems, db.assignments, selectedTemplate]);

  // FUNKSJON: Synkroniser bemanningsliste med kjøreplan
  const handleSyncStaffing = () => {
    if (!selectedTemplate) return;

    // Finn unike kombinasjoner i kjøreplanen
    const uniqueCombos = new Map<string, { roleId: string, personId: string | null }>();
    currentTemplateProgramItems.forEach(item => {
      if (item.service_role_id) {
        const key = `${item.service_role_id}-${item.person_id || 'null'}`;
        if (!uniqueCombos.has(key)) {
          uniqueCombos.set(key, { 
            roleId: item.service_role_id, 
            personId: item.person_id || null 
          });
        }
      }
    });

    const programRoleIds = new Set(currentTemplateProgramItems.filter(p => p.service_role_id).map(p => p.service_role_id));

    setDb(prev => {
      // Behold assignments fra andre maler
      const otherAssignments = prev.assignments.filter(a => a.template_id !== selectedTemplate.id);
      
      // Behold manuelle vakter i denne malen (roller som IKKE finnes i kjøreplanen)
      const manualAssignments = prev.assignments.filter(a => 
        a.template_id === selectedTemplate.id && !programRoleIds.has(a.service_role_id)
      );

      // Opprett nye assignments basert på kjøreplanen
      const newAssignments: Assignment[] = Array.from(uniqueCombos.values()).map(combo => ({
        id: crypto.randomUUID(),
        template_id: selectedTemplate.id,
        occurrence_id: null,
        service_role_id: combo.roleId,
        person_id: combo.personId,
        display_order: 1 // Default i Master
      }));

      // Opprett loggføring
      const log: ChangeLog = {
        id: crypto.randomUUID(),
        occurrence_id: '',
        actor_id: 'system',
        timestamp: new Date().toISOString(),
        description: `Bemanning for mal "${selectedTemplate.title}" ble synkronisert med kjøreplan.`
      };

      return {
        ...prev,
        assignments: [...otherAssignments, ...manualAssignments, ...newAssignments],
        changeLogs: [...prev.changeLogs, log]
      };
    });
  };

  const staffingData = useMemo(() => {
    if (!selectedTemplate) return { programLinked: [], manual: [] };

    const programRoleIds = new Set(currentTemplateProgramItems.filter(p => p.service_role_id).map(p => p.service_role_id));
    const allAssignments = db.assignments.filter(a => a.template_id === selectedTemplate.id);

    const programLinked = allAssignments
      .filter(a => programRoleIds.has(a.service_role_id))
      .map(a => {
        const role = db.serviceRoles.find(r => r.id === a.service_role_id);
        const person = a.person_id ? db.persons.find(p => p.id === a.person_id) : null;
        return { ...a, roleName: role?.name || 'Ukjent', personName: person?.name || 'Ledig' };
      });

    const manual = allAssignments
      .filter(a => !programRoleIds.has(a.service_role_id))
      .map(a => {
        const role = db.serviceRoles.find(r => r.id === a.service_role_id);
        const person = a.person_id ? db.persons.find(p => p.id === a.person_id) : null;
        return { ...a, roleName: role?.name || 'Ukjent', personName: person?.name || 'Ledig' };
      });

    return { programLinked, manual };
  }, [selectedTemplate, currentTemplateProgramItems, db.assignments, db.serviceRoles, db.persons]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex && selectedTemplate) {
      const items = [...currentTemplateProgramItems];
      const [reorderedItem] = items.splice(draggedIndex, 1);
      items.splice(dragOverIndex, 0, reorderedItem);
      
      const updatedItemsMap = new Map(items.map((item, idx) => [item.id, idx]));
      
      setDb(prev => ({
        ...prev,
        programItems: prev.programItems.map(p => {
          if (p.template_id === selectedTemplate.id && updatedItemsMap.has(p.id)) {
            return { ...p, order: updatedItemsMap.get(p.id)! };
          }
          return p;
        })
      }));
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateTitle.trim()) return;

    const newTemplate: EventTemplate = {
      id: crypto.randomUUID(),
      title: newTemplateTitle,
      type: newTemplateType,
      recurrence_rule: newTemplateRecurrence,
      color: newTemplateColor || '#2563eb'
    };

    setDb(prev => ({
      ...prev,
      eventTemplates: [...prev.eventTemplates, newTemplate]
    }));

    setNewTemplateTitle('');
    setNewTemplateColor('#2563eb');
    setIsTemplateModalOpen(false);
    setSelectedTemplate(newTemplate);
  };

  // Faste fargealternativer
  const colorOptions = [
    { name: 'Blå', value: '#2563eb' },
    { name: 'Grønn', value: '#16a34a' },
    { name: 'Gul', value: '#ca8a04' },
    { name: 'Rød', value: '#dc2626' },
    { name: 'Lilla', value: '#9333ea' },
    { name: 'Turkis', value: '#0891b2' }
  ];

  const handleOpenAddModal = () => {
    setEditingProgramItem(null);
    setProgTitle('');
    setProgDuration(5);
    setProgRoleId('');
    setProgGroupId('');
    setProgPersonId('');
    setProgDescription('');
    setIsProgramModalOpen(true);
  };

  const handleOpenEditModal = (item: ProgramItem) => {
    setEditingProgramItem(item);
    setProgTitle(item.title);
    setProgDuration(item.duration_minutes);
    setProgRoleId(item.service_role_id || '');
    setProgGroupId(item.group_id || '');
    setProgPersonId(item.person_id || '');
    setProgDescription(item.description || '');
    setIsProgramModalOpen(true);
  };

  const handleSaveProgramItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !progTitle.trim()) return;

    if (editingProgramItem) {
      if (onUpdateProgramItem) {
        onUpdateProgramItem(editingProgramItem.id, {
          title: progTitle,
          duration_minutes: progDuration,
          service_role_id: progRoleId || null,
          group_id: progGroupId || null,
          person_id: progPersonId || null,
          description: progDescription.trim() || undefined
        });
      } else {
        setDb(prev => ({
          ...prev,
          programItems: prev.programItems.map(p => p.id === editingProgramItem.id ? {
            ...p,
            title: progTitle,
            duration_minutes: progDuration,
            service_role_id: progRoleId || null,
            group_id: progGroupId || null,
            person_id: progPersonId || null,
            description: progDescription.trim() || undefined
          } : p)
        }));
      }
    } else {
      const items = db.programItems.filter(p => p.template_id === selectedTemplate.id);
      const newItem: ProgramItem = {
        id: crypto.randomUUID(),
        template_id: selectedTemplate.id,
        title: progTitle,
        duration_minutes: progDuration,
        service_role_id: progRoleId || null,
        group_id: progGroupId || null,
        person_id: progPersonId || null,
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
    setProgDescription('');
    setIsProgramModalOpen(false);
    setEditingProgramItem(null);
  };

  const handleUpdateManualAssignment = (id: UUID, personId: string | null) => {
    setDb(prev => ({
      ...prev,
      assignments: prev.assignments.map(a => a.id === id ? { ...a, person_id: personId } : a)
    }));
  };

  const handleAddMasterRole = (roleId: UUID) => {
    if (!selectedTemplate) return;
    
    const newAssignment: Assignment = {
      id: crypto.randomUUID(),
      template_id: selectedTemplate.id,
      occurrence_id: null,
      service_role_id: roleId,
      person_id: null
    };
    setDb(prev => ({
      ...prev,
      assignments: [...prev.assignments, newAssignment]
    }));
    setIsAddRoleModalOpen(false);
  };

  const handleDeleteAssignment = (id: UUID) => {
    if (!confirm('Vil du fjerne denne tilleggsvakten fra master-malen?')) return;
    setDb(prev => ({
      ...prev,
      assignments: prev.assignments.filter(a => a.id !== id)
    }));
  };

  const handlePlanRecurring = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !recEndDate) return;
    
    const frequencyType = recFrequency === 'monthly' ? 'monthly' : 'weekly';
    // For weekly frequencies, use the interval from the frequency selection
    let interval: number;
    if (recFrequency === 'monthly') {
      interval = recMonthWeek;
    } else if (recFrequency === 'weekly') {
      interval = 1;
    } else if (recFrequency === 'biweekly') {
      interval = 2;
    } else if (recFrequency === 'triweekly') {
      interval = 3;
    } else { // quadweekly
      interval = 4;
    }
    
    onCreateRecurring(
      selectedTemplate.id, 
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
    setRecWeekInterval(1);
    setRecMonthWeek(1);
  };

  const handleDeleteTemplate = (id: UUID) => {
    if (!confirm('Er du sikker på at du vil slette denne master-malen? Dette sletter ikke eksisterende hendelser i kalenderen.')) return;
    setDb(prev => ({
      ...prev,
      eventTemplates: prev.eventTemplates.filter(t => t.id !== id)
    }));
    if (selectedTemplate?.id === id) {
      setSelectedTemplate(db.eventTemplates.filter(t => t.id !== id)[0] || null);
    }
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

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-500 text-left">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Settings className="text-amber-500" size={28} />
            Master-meny <span className="text-amber-500 font-normal">(Gul sone)</span>
          </h2>
          <p className="text-slate-500">Administrer menighetens arrangement-maler og grunnoppsett.</p>
        </div>
        <button 
          onClick={() => setIsTemplateModalOpen(true)}
          className="bg-amber-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all flex items-center gap-2"
        >
          <Plus size={20} /> Ny Master-mal
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 text-left">
        <aside className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Valgt Mal</h3>
          {db.eventTemplates.map(t => (
            <button 
              key={t.id}
              onClick={() => setSelectedTemplate(t)}
              className={`w-full text-left px-5 py-4 rounded-2xl transition-all border ${selectedTemplate?.id === t.id ? 'bg-amber-50 border-amber-200 text-amber-800 shadow-sm' : 'bg-white border-transparent text-slate-600 hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full border border-slate-300 flex-shrink-0"
                  style={{ backgroundColor: t.color || '#2563eb' }}
                />
                <p className="font-bold text-sm">{t.title}</p>
              </div>
              <p className="text-[10px] opacity-60 mt-1 uppercase tracking-tighter">{t.recurrence_rule}</p>
            </button>
          ))}
        </aside>

        <main className="lg:col-span-3 space-y-6">
          {selectedTemplate ? (
            <div className="bg-white rounded-3xl border border-amber-100 shadow-sm overflow-hidden">
              <div className="p-8 bg-amber-50 border-b border-amber-100 flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-2xl font-bold text-amber-900">{selectedTemplate.title}</h4>
                    <div className="flex gap-2 items-center">
                      {colorOptions.map(color => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => {
                            setDb(prev => ({
                              ...prev,
                              eventTemplates: prev.eventTemplates.map(t =>
                                t.id === selectedTemplate.id
                                  ? { ...t, color: color.value }
                                  : t
                              )
                            }));
                            setSelectedTemplate(prev => prev ? { ...prev, color: color.value } : null);
                          }}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            (selectedTemplate.color || '#2563eb') === color.value
                              ? 'border-slate-800 scale-110 shadow-lg'
                              : 'border-slate-300 hover:border-slate-500'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                      <input
                        type="color"
                        value={selectedTemplate.color || '#2563eb'}
                        onChange={e => {
                          setDb(prev => ({
                            ...prev,
                            eventTemplates: prev.eventTemplates.map(t =>
                              t.id === selectedTemplate.id
                                ? { ...t, color: e.target.value }
                                : t
                            )
                          }));
                          setSelectedTemplate(prev => prev ? { ...prev, color: e.target.value } : null);
                        }}
                        className="w-8 h-8 rounded-full border-2 border-slate-300 cursor-pointer"
                        title="Egendefinert farge"
                      />
                    </div>
                  </div>
                  <p className="text-amber-700/60 font-medium">Denne malen brukes som "oppskrift" for nye hendelser.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsRecurringModalOpen(true)}
                    className="p-3 bg-white rounded-xl text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm flex items-center gap-2 font-bold text-sm"
                  >
                    <Repeat size={18} /> Planlegg Serie
                  </button>
                  <button 
                    onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                    className="p-3 bg-white rounded-xl text-red-500 hover:bg-red-50 transition-colors shadow-sm"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-8 space-y-8">
                {/* SEKSJON 1: KJØREPLAN */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h5 className="font-bold text-slate-800 flex items-center gap-2">
                      <Clock size={18} className="text-indigo-500" />
                      Standard Kjøreplan
                    </h5>
                    <div className="flex items-center gap-3">
                      <p className="text-[10px] text-slate-400 italic">Dra og slipp for å endre rekkefølge</p>
                      <button 
                        onClick={handleOpenAddModal}
                        className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1"
                      >
                        <Plus size={14} /> Ny Aktivitet
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {currentTemplateProgramItems.map((item, idx) => {
                        const role = db.serviceRoles.find(r => r.id === item.service_role_id);
                        const group = db.groups.find(g => g.id === item.group_id);
                        const person = item.person_id ? db.persons.find(p => p.id === item.person_id) : null;
                        
                        const isDragged = draggedIndex === idx;
                        const isOver = dragOverIndex === idx;

                        return (
                          <div 
                            key={item.id} 
                            draggable
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center gap-4 p-3 bg-slate-50 border rounded-xl transition-all group ${isDragged ? 'opacity-30' : 'opacity-100'} ${isOver ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-100'}`}
                          >
                            <div className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-500">
                              <GripVertical size={16} />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-slate-800">{item.title}</p>
                              <div className="flex flex-wrap gap-3 mt-1.5">
                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <Clock size={10} /> {item.duration_minutes} min
                                </span>
                                {role && (
                                  <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                    <Shield size={10} /> {role.name}
                                  </span>
                                )}
                                {group && (
                                  <span className="text-[10px] text-teal-600 font-bold uppercase tracking-wider flex items-center gap-1 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                                    <Users size={10} /> {group.name}
                                  </span>
                                )}
                                {person && (
                                  <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                    <UserCheck size={10} /> {person.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-colors">
                              <button onClick={() => handleOpenEditModal(item)} className="p-1.5 text-slate-300 hover:text-indigo-600"><Edit2 size={14} /></button>
                              <button onClick={() => onDeleteProgramItem(item.id)} className="p-1.5 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </section>

                {/* MELLOMKJØTT: SYNKRONISERINGSKNAPP */}
                <div className={`py-4 flex justify-center border-y transition-all ${isUnsynced ? 'border-amber-200 bg-amber-50/30' : 'border-slate-50'}`}>
                  <button 
                    disabled={!isUnsynced}
                    onClick={handleSyncStaffing}
                    className={`flex items-center gap-3 px-10 py-4 rounded-2xl font-bold transition-all shadow-lg ${
                      isUnsynced 
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 scale-105 animate-pulse shadow-indigo-500/50' 
                        : 'bg-slate-100 text-slate-400 grayscale cursor-not-allowed'
                    }`}
                  >
                    {isUnsynced ? (
                      <>
                        <RefreshCw className="animate-spin" size={20} />
                        <span>Lagre og synkroniser bemanning</span>
                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Endringer i kjøreplan</span>
                      </>
                    ) : (
                      <>
                        <Save size={20} />
                        <span>Lagre og synkroniser bemanning</span>
                        <span className="text-xs bg-slate-200/50 px-2 py-0.5 rounded-full">Synkronisert</span>
                      </>
                    )}
                  </button>
                </div>

                {/* SEKSJON 2: BEMANNING */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-slate-800 flex items-center gap-2">
                      <Shield size={18} className="text-indigo-500" />
                      Standard Bemanning (Vaktliste)
                    </h5>
                    <button 
                      onClick={() => setIsAddRoleModalOpen(true)}
                      className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1"
                    >
                      <Plus size={14} /> Legg til tilleggsvakt
                    </button>
                  </div>

                  {isUnsynced && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
                      <AlertCircle className="text-amber-500" size={20} />
                      <p className="text-xs font-bold text-amber-800">Endringer i kjøreplanen er ikke synkronisert ennå. Klikk på knappen over for å oppdatere vaktlisten.</p>
                    </div>
                  )}
                  
                  {/* SEKSJON: OPPGAVER FRA KJØREPLAN */}
                  {staffingData.programLinked.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                        <Library size={16} className="text-indigo-500" />
                        <h6 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Oppgaver fra kjøreplan</h6>
                        <span className="text-[9px] px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-bold">
                          {staffingData.programLinked.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {staffingData.programLinked.map(assign => (
                          <div 
                            key={assign.id} 
                            className="p-4 rounded-xl border-2 border-indigo-100 bg-indigo-50/30 flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 shrink-0">
                                <Lock size={16} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-slate-800 text-sm block">{assign.roleName}</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[9px] px-1.5 py-0.5 bg-indigo-200 text-indigo-700 font-bold uppercase tracking-tighter rounded">Fra kjøreplan</span>
                                  <span className="text-[10px] font-semibold text-slate-700">• {assign.personName}</span>
                                </div>
                              </div>
                            </div>
                            <Info size={14} className="text-indigo-300 shrink-0" title="Denne oppgaven er hentet fra kjøreplanen og oppdateres automatisk ved synkronisering" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SEKSJON: TILLEGGSVAKTER (MANUELLE) */}
                  {staffingData.manual.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-slate-200">
                      <div className="flex items-center gap-2 pb-2">
                        <Shield size={16} className="text-amber-500" />
                        <h6 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tilleggsvakter (Manuelt lagt til)</h6>
                        <span className="text-[9px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold">
                          {staffingData.manual.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {staffingData.manual.map(assign => {
                       const { recommended, others } = getCategorizedPersons(assign.service_role_id);
                       return (
                        <div 
                          key={assign.id} 
                          className="p-4 rounded-xl border-2 border-amber-200 bg-amber-50/30 hover:border-amber-300 shadow-sm flex flex-col gap-3 group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="p-2 bg-amber-100 rounded-lg text-amber-600 shrink-0">
                                <Shield size={16} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-slate-800 text-sm block">{assign.roleName}</span>
                                <span className="text-[9px] px-1.5 py-0.5 bg-amber-200 text-amber-700 font-bold uppercase tracking-tighter rounded inline-block mt-1">Tilleggsvakt</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleDeleteAssignment(assign.id)}
                              className="p-1.5 text-amber-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                              title="Fjern tilleggsvakt"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          
                          <select 
                            value={assign.person_id || ''} 
                            onChange={(e) => handleUpdateManualAssignment(assign.id, e.target.value || null)}
                            className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-[11px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="">Tildel person i mal...</option>
                            {recommended.length > 0 && (
                              <optgroup label="Anbefalt Team">
                                {recommended.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </optgroup>
                            )}
                            <optgroup label="Alle Personer">
                              {others.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </optgroup>
                          </select>
                        </div>
                      );
                    })}
                      </div>
                    </div>
                  )}

                  {/* HVIS INGEN OPPGAVER */}
                  {staffingData.programLinked.length === 0 && staffingData.manual.length === 0 && (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                      <Shield size={24} className="text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 font-semibold">Ingen bemanning satt opp ennå</p>
                      <p className="text-xs text-slate-400 mt-1">Legg til oppgaver i kjøreplanen eller legg til tilleggsvakter manuelt</p>
                    </div>
                  )}
                </section>

                {/* SEKSJON 3: EKSISTERENDE ARRANGEMENTER */}
                <section className="space-y-6 pt-6 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-slate-800 flex items-center gap-2">
                      <Calendar size={18} className="text-indigo-500" />
                      Eksisterende Arrangementer
                    </h5>
                  </div>
                  
                  {(() => {
                    const templateOccurrences = db.eventOccurrences
                      .filter(o => o.template_id === selectedTemplate.id)
                      .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
                    
                    return templateOccurrences.length > 0 ? (
                      <div className="space-y-3">
                        {templateOccurrences.map(occ => (
                          <div 
                            key={occ.id} 
                            className="p-4 rounded-xl border-2 border-slate-100 bg-white hover:border-indigo-200 shadow-sm flex items-center gap-4 group"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="date"
                                    value={occ.date}
                                    onChange={(e) => onUpdateOccurrence(occ.id, { date: e.target.value })}
                                    className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
                                  />
                                  <input
                                    type="time"
                                    value={occ.time || ''}
                                    onChange={(e) => onUpdateOccurrence(occ.id, { time: e.target.value || undefined })}
                                    className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-500">
                                    {new Intl.DateTimeFormat('no-NO', { weekday: 'short', day: 'numeric', month: 'short' }).format(parseLocalDate(occ.date))}
                                  </span>
                                  {occ.time && (
                                    <span className="text-xs font-semibold text-indigo-600">{occ.time}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold ${
                                  occ.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {occ.status}
                                </span>
                                {occ.title_override && (
                                  <span className="text-xs text-slate-600 font-semibold">{occ.title_override}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        <Calendar size={24} className="text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500 font-semibold">Ingen arrangementer opprettet ennå</p>
                        <p className="text-xs text-slate-400 mt-1">Bruk "Planlegg Serie" for å opprette arrangementer fra denne malen</p>
                      </div>
                    );
                  })()}
                </section>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center bg-slate-100 border-2 border-dashed rounded-3xl text-slate-400">
              <p>Opprett eller velg en mal for å starte planleggingen.</p>
            </div>
          )}
        </main>
      </div>

      {/* Program Item Add/Edit Modal */}
      {isProgramModalOpen && selectedTemplate && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { 
            setIsProgramModalOpen(false); 
            setEditingProgramItem(null);
            // Reset alle felter
            setProgTitle('');
            setProgDuration(5);
            setProgRoleId('');
            setProgGroupId('');
            setProgPersonId('');
            setProgDescription('');
          }}></div>
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="p-6 bg-indigo-700 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingProgramItem ? 'Rediger Aktivitet' : 'Ny Aktivitet'}</h3>
              <button onClick={() => { 
                setIsProgramModalOpen(false); 
                setEditingProgramItem(null);
                // Reset alle felter
                setProgTitle('');
                setProgDuration(5);
                setProgRoleId('');
                setProgGroupId('');
                setProgPersonId('');
                setProgDescription('');
              }}><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveProgramItem} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tittel / Hva skjer?</label>
                <input autoFocus required type="text" value={progTitle} onChange={e => setProgTitle(e.target.value)} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="f.eks. Åpning & Velkomst" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5"><Shield size={12}/> Tjenesterolle</label>
                  <select 
                    value={progRoleId} 
                    onChange={e => { setProgRoleId(e.target.value); if(e.target.value) setProgGroupId(''); }} 
                    className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                  >
                    <option value="">Ingen valgt</option>
                    {db.serviceRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5"><Users size={12}/> Team (Gruppe)</label>
                  <select 
                    value={progGroupId} 
                    onChange={e => { 
                      const groupId = e.target.value;
                      setProgGroupId(groupId); 
                      if(groupId) {
                        setProgRoleId('');
                        const leader = db.groupMembers.find(gm => gm.group_id === groupId && gm.role === GroupRole.LEADER);
                        if (leader) setProgPersonId(leader.person_id);
                      }
                    }} 
                    className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                  >
                    <option value="">Ingen valgt</option>
                    {db.groups.filter(g => g.category === GroupCategory.SERVICE).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5"><UserPlus size={12}/> Ansvarlig person i mal</label>
                <select 
                  value={progPersonId} 
                  onChange={e => setProgPersonId(e.target.value)} 
                  className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                >
                  <option value="">Ingen fast person (Valgfritt)</option>
                  {(() => {
                    const { recommended, others } = getCategorizedPersons(progRoleId, progGroupId);
                    return (
                      <>
                        {recommended.length > 0 && (
                          <optgroup label="Anbefalt Team / Leder">
                            {recommended.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </optgroup>
                        )}
                        <optgroup label="Alle Personer">
                          {others.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </optgroup>
                      </>
                    );
                  })()}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">Tekstboks</label>
                <textarea 
                  value={progDescription} 
                  onChange={e => setProgDescription(e.target.value)} 
                  rows={3}
                  className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm resize-none"
                  placeholder="Skriv inn tekst..."
                />
              </div>

              <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-all">
                {editingProgramItem ? 'Oppdater' : 'Legg til'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Katalogrolle Velger-Modal */}
      {isAddRoleModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsAddRoleModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden text-left animate-in zoom-in-95">
            <div className="p-4 bg-indigo-700 text-white flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-tight">Velg rolle fra katalog</h3>
              <button onClick={() => setIsAddRoleModalOpen(false)}><X size={18}/></button>
            </div>
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {db.serviceRoles.map(sr => (
                <button 
                  key={sr.id} 
                  onClick={() => handleAddMasterRole(sr.id)} 
                  className="w-full p-4 rounded-xl border text-left flex justify-between items-center hover:border-indigo-500 hover:bg-indigo-50 transition-all"
                >
                  <div className="font-bold text-slate-800 text-sm">{sr.name}</div>
                  <Plus size={16} className="text-indigo-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Ny Mal Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsTemplateModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="p-6 bg-amber-500 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold">Ny Master-mal</h3>
              <button onClick={() => setIsTemplateModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleCreateTemplate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Navn på mal</label>
                <input autoFocus required type="text" value={newTemplateTitle} onChange={e => setNewTemplateTitle(e.target.value)} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all" placeholder="f.eks. Lovsangsmøte" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Farge</label>
                <div className="flex gap-2 items-center">
                  {colorOptions.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setNewTemplateColor(color.value)}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${
                        newTemplateColor === color.value 
                          ? 'border-slate-800 scale-110 shadow-lg' 
                          : 'border-slate-300 hover:border-slate-500'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={newTemplateColor}
                    onChange={e => setNewTemplateColor(e.target.value)}
                    className="w-10 h-10 rounded-full border-2 border-slate-300 cursor-pointer"
                    title="Egendefinert farge"
                  />
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-amber-500 text-white rounded-2xl font-bold shadow-lg hover:bg-amber-600 transition-all">Opprett Master</button>
            </form>
          </div>
        </div>
      )}

      {/* Planlegg Serie Modal */}
      {isRecurringModalOpen && selectedTemplate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm shadow-xl" onClick={() => setIsRecurringModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="p-6 bg-indigo-700 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2"><Repeat size={20} /> Planlegg serie</h3>
              <button onClick={() => setIsRecurringModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handlePlanRecurring} className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Bruker mal:</p>
                <p className="text-sm font-bold text-slate-800">{selectedTemplate.title}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Startdato</label>
                <input required type="date" value={recStartDate} onChange={e => setRecStartDate(e.target.value)} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Start tidspunkt (valgfritt)</label>
                <input type="time" value={recStartTime} onChange={e => setRecStartTime(e.target.value)} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Siste dato</label>
                <input required type="date" value={recEndDate} onChange={e => setRecEndDate(e.target.value)} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Frekvens</label>
                <select 
                  value={recFrequency} 
                  onChange={(e) => {
                    setRecFrequency(e.target.value as 'weekly' | 'biweekly' | 'triweekly' | 'quadweekly' | 'monthly');
                    if (e.target.value === 'monthly') {
                      setRecWeekInterval(1);
                    } else if (e.target.value === 'weekly') {
                      setRecWeekInterval(1);
                    } else if (e.target.value === 'biweekly') {
                      setRecWeekInterval(2);
                    } else if (e.target.value === 'triweekly') {
                      setRecWeekInterval(3);
                    } else if (e.target.value === 'quadweekly') {
                      setRecWeekInterval(4);
                    } else {
                      setRecMonthWeek(1);
                    }
                  }}
                  className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
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
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Uke i måneden</label>
                  <select 
                    value={recMonthWeek} 
                    onChange={(e) => setRecMonthWeek(parseInt(e.target.value))}
                    className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
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
                  <p className="text-xs text-slate-500 mb-2">
                    {recFrequency === 'weekly' && 'Arrangementet vil opprettes hver uke på samme ukedag'}
                    {recFrequency === 'biweekly' && 'Arrangementet vil opprettes hver 2. uke på samme ukedag'}
                    {recFrequency === 'triweekly' && 'Arrangementet vil opprettes hver 3. uke på samme ukedag'}
                    {recFrequency === 'quadweekly' && 'Arrangementet vil opprettes hver 4. uke på samme ukedag'}
                  </p>
                </div>
              )}
              <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-all">Start planlegging</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterMenu;
