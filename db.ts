
import { AppState, UUID, Assignment, Task, EventOccurrence, ProgramItem, OccurrenceStatus, Person } from './types';
import { EMPTY_DATA } from './constants';

const DB_KEY = 'eventmaster_lmk_db';
const IMAGE_LIBRARY_KEY = 'eventmaster_image_library';

// Hjelpefunksjon for å sanere fødselsdatoer til ISO-format (YYYY-MM-DD)
const sanitizeBirthDate = (date: string | undefined | null): string | undefined => {
  if (!date) return undefined;
  
  // Hvis allerede i ISO-format (YYYY-MM-DD), returner som den er
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  // Prøv å parse som Date og konverter til ISO-format
  try {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    // Hvis parsing feiler, returner undefined
  }
  
  return undefined;
};

// Hjelpefunksjon for å laste data fra master_data_backup.json (hvis den finnes)
const loadFromBackup = (): Partial<AppState> | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    // Prøv å laste fra backup-filen via fetch (kun i browser)
    // Merk: Dette vil ikke fungere direkte fra filsystemet, men kan brukes hvis filen er tilgjengelig
    // For nå, returner null og bruk localStorage
    return null;
  } catch (e) {
    return null;
  }
};

export const getDB = (): AppState => {
  // Først prøv å laste fra backup-filen (hvis tilgjengelig)
  const backupData = loadFromBackup();
  
  const data = localStorage.getItem(DB_KEY);
  let parsedData: AppState;
  
  if (!data && backupData) {
    // Bruk backup-data hvis localStorage er tom
    parsedData = { ...EMPTY_DATA, ...backupData } as AppState;
  } else if (!data) {
    // Ingen data i localStorage eller backup, bruk tomt datasett
    parsedData = EMPTY_DATA;
  } else {
    parsedData = JSON.parse(data);
  }
  
  // Saner alle fødselsdatoer til ISO-format
  if (parsedData.persons) {
    parsedData.persons = parsedData.persons.map((person: Person) => ({
      ...person,
      birth_date: sanitizeBirthDate(person.birth_date)
    }));
  }

  // Flett inn bilde-URLer fra bildebasen hvis de finnes
  try {
    const imageLibraryRaw = localStorage.getItem(IMAGE_LIBRARY_KEY);
    if (imageLibraryRaw && parsedData.persons) {
      const imageLibrary = JSON.parse(imageLibraryRaw) as Record<string, string>;
      parsedData.persons = parsedData.persons.map(person => ({
        ...person,
        imageUrl: imageLibrary[person.id] || person.imageUrl
      }));
    }
  } catch (e) {
    // Ignorer feil og bruk data som normalt
  }
  
  return parsedData;
};

export const saveDB = (state: AppState) => {
  localStorage.setItem(DB_KEY, JSON.stringify(state));
};

export const getImageLibrary = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(IMAGE_LIBRARY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

export const saveImageLibraryEntry = (personId: UUID, imageUrl: string) => {
  const library = getImageLibrary();
  library[personId] = imageUrl;
  localStorage.setItem(IMAGE_LIBRARY_KEY, JSON.stringify(library));
};

export const removeImageLibraryEntry = (personId: UUID) => {
  const library = getImageLibrary();
  if (library[personId]) {
    delete library[personId];
    localStorage.setItem(IMAGE_LIBRARY_KEY, JSON.stringify(library));
  }
};

// Hjelpefunksjon for å resettere til tomt datasett (kan kalles fra konsollen)
export const resetToEmptyData = () => {
  localStorage.setItem(DB_KEY, JSON.stringify(EMPTY_DATA));
  return EMPTY_DATA;
};

// Eksporter personer og grupper til JSON
export const exportPersonsAndGroups = (): {
  persons: any[];
  groups: any[];
  exportDate: string;
  version: string;
} => {
  const db = getDB();
  return {
    persons: db.persons || [],
    groups: db.groups || [],
    exportDate: new Date().toISOString(),
    version: '0.4'
  };
};

// Hjelpefunksjon for å eksportere og laste ned som fil (kan kalles fra browser console)
export const downloadPersonsAndGroups = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.error('❌ Denne funksjonen kan kun kjøres i nettleseren');
    return null;
  }
  
  const exportData = exportPersonsAndGroups();
  const json = JSON.stringify(exportData, null, 2);
  
  // Last ned som fil
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'master_data_backup.json';
  a.click();
  URL.revokeObjectURL(url);
  
  console.log('✅ Eksportert:', {
    persons: exportData.persons.length,
    groups: exportData.groups.length,
    exportDate: exportData.exportDate
  });
  
  return exportData;
};

/**
 * Performs a snapshot of a template into a specific occurrence.
 * Copies assignments, tasks, and program items from the "Yellow Zone" (Master) to the "White Zone" (Occurrence).
 */
export const performBulkCopy = (occurrence: EventOccurrence, state: AppState): AppState => {
  // Prevent duplicate bulk copy
  const existingAssignments = state.assignments.filter(a => a.occurrence_id === occurrence.id);
  if (existingAssignments.length > 0) return state;

  // 1. Get all program items for the template
  const templateProgramItems = state.programItems.filter(p => p.template_id === occurrence.template_id);
  
  // Create local copies of program items for this occurrence
  const newProgramItems: ProgramItem[] = templateProgramItems.map(tp => ({
    id: crypto.randomUUID(),
    occurrence_id: occurrence.id,
    template_id: null,
    title: tp.title,
    duration_minutes: tp.duration_minutes,
    service_role_id: tp.service_role_id,
    group_id: tp.group_id,
    person_id: tp.person_id,
    order: tp.order
  }));

  // 2. Calculate program-based assignments (Source A)
  // We need to create a unique assignment for each [role + person] combo in the program
  const autoAssignments: Assignment[] = [];
  const roleCounts = new Map<string, number>();
  const templateProgramRoleIds = new Set(templateProgramItems.filter(p => p.service_role_id).map(p => p.service_role_id));

  templateProgramItems.forEach(tp => {
    if (tp.service_role_id) {
      const count = (roleCounts.get(tp.service_role_id) || 0) + 1;
      roleCounts.set(tp.service_role_id, count);
      
      autoAssignments.push({
        id: crypto.randomUUID(),
        occurrence_id: occurrence.id,
        template_id: null,
        service_role_id: tp.service_role_id,
        person_id: tp.person_id,
        display_order: count
      });
    }
  });

  // 3. Get manual assignments (Source B)
  const templateManualAssignments = state.assignments.filter(a =>
    a.template_id === occurrence.template_id && !templateProgramRoleIds.has(a.service_role_id)
  );
  const newManualAssignments: Assignment[] = templateManualAssignments.map(ta => ({
    id: crypto.randomUUID(),
    occurrence_id: occurrence.id,
    template_id: null,
    service_role_id: ta.service_role_id,
    person_id: ta.person_id,
    display_order: 0 // Manual assignments usually don't need index-based numbering initially
  }));

  // 4. Create local copies of tasks for this occurrence
  const templateTasks = state.tasks.filter(t => t.template_id === occurrence.template_id);
  const newTasks: Task[] = templateTasks.map(tt => ({
    id: crypto.randomUUID(),
    occurrence_id: occurrence.id,
    template_id: null,
    title: tt.title,
    deadline: occurrence.date, // Default task deadline to event date
    responsible_id: tt.responsible_id,
    is_global: false
  }));

  return {
    ...state,
    assignments: [...state.assignments, ...autoAssignments, ...newManualAssignments],
    programItems: [...state.programItems, ...newProgramItems],
    tasks: [...state.tasks, ...newTasks]
  };
};
