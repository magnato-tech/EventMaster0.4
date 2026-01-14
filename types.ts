
export type UUID = string;

export enum GroupCategory {
  SERVICE = 'service',
  FELLOWSHIP = 'fellowship',
  STRATEGY = 'strategy',
  BARNKIRKE = 'barnekirke'
}

export enum FamilyRole {
  PARENT = 'parent',
  CHILD = 'child',
  PARTNER = 'partner',
  GUARDIAN = 'guardian'
}

export enum GroupRole {
  LEADER = 'leader',
  DEPUTY_LEADER = 'deputy_leader',
  MEMBER = 'member'
}

export enum OccurrenceStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published'
}

export enum CoreRole {
  ADMIN = 'admin',
  PASTOR = 'pastor',
  TEAM_LEADER = 'team_leader',
  MEMBER = 'member',
  GUEST = 'guest'
}

export interface GatheringPattern {
  frequency_type: 'weeks' | 'months';
  interval: number;
  day_of_week: number;
  start_date: string;
}

export interface Person {
  id: UUID;
  name: string;
  email?: string;
  phone?: string;
  social_security_number?: string;
  birth_year?: number;
  birth_date?: string;
  streetAddress?: string;
  postalCode?: string;
  city?: string;
  is_admin: boolean;
  is_active: boolean;
  core_role: CoreRole;
}

export interface Group {
  id: UUID;
  name: string;
  category: GroupCategory;
  description?: string;
  link?: string;
  parent_id?: UUID | null;
  gathering_pattern?: GatheringPattern;
  leaderId?: string;
  deputyId?: string;
}

export interface GroupMember {
  id: UUID;
  group_id: UUID;
  person_id: UUID;
  role: GroupRole;
  service_role_id?: UUID | null;
}

export interface ServiceRole {
  id: UUID;
  name: string;
  description?: string;
  default_instructions: string[];
  is_active: boolean;
}

export interface GroupServiceRole {
  id: UUID;
  group_id: UUID;
  service_role_id: UUID;
  instructions_override?: string[];
  is_active: boolean;
}

export interface EventTemplate {
  id: UUID;
  title: string;
  type: string;
  recurrence_rule: string;
  color?: string; // Farge for events (hex-kode, f.eks. '#2563eb' for blå)
}

export interface EventOccurrence {
  id: UUID;
  template_id: UUID | null;
  date: string;
  time?: string; // Format: "HH:mm" (e.g., "10:00")
  title_override?: string;
  theme?: string; // Tema for dagen i tekstformat
  bible_verse?: string; // Dagens bibbelord
  status: OccurrenceStatus;
  last_synced_at?: string;
  color?: string; // Farge for event (arves fra template)
}

export interface Assignment {
  id: UUID;
  occurrence_id?: UUID | null;
  template_id?: UUID | null;
  service_role_id: UUID;
  person_id?: UUID | null;
  display_order?: number; // For (1), (2) etc
}

export interface ProgramItem {
  id: UUID;
  template_id?: UUID | null;
  occurrence_id?: UUID | null;
  title: string;
  duration_minutes: number;
  service_role_id?: UUID | null;
  group_id?: UUID | null;
  person_id?: UUID | null;
  order: number;
  description?: string; // Tekstbeskrivelse/tema for programposten
}

export interface Task {
  id: UUID;
  occurrence_id?: UUID | null;
  template_id?: UUID | null;
  title: string;
  deadline: string;
  responsible_id: UUID;
  is_global: boolean;
}

export interface ChangeLog {
  id: UUID;
  occurrence_id: UUID;
  actor_id: UUID;
  timestamp: string;
  description: string;
}

export interface NoticeMessage {
  id: UUID;
  sender_id: UUID | 'system';
  recipient_role: CoreRole; 
  title: string;
  content: string;
  created_at: string;
  occurrence_id?: UUID;
  isRead?: boolean; // Standard false hvis ikke satt
}

export interface Family {
  id: UUID;
  name?: string; // Valgfritt familiensavn
  streetAddress?: string;
  postalCode?: string;
  city?: string;
  created_at: string;
}

export interface FamilyMember {
  id: UUID;
  family_id: UUID;
  person_id: UUID;
  role: FamilyRole;
  isPrimaryResidence: boolean; // Kun én per person kan være true
}

export interface AppState {
  persons: Person[];
  groups: Group[];
  groupMembers: GroupMember[];
  serviceRoles: ServiceRole[];
  groupServiceRoles: GroupServiceRole[];
  eventTemplates: EventTemplate[];
  eventOccurrences: EventOccurrence[];
  assignments: Assignment[];
  programItems: ProgramItem[];
  tasks: Task[];
  noticeMessages: NoticeMessage[];
  changeLogs: ChangeLog[];
  families: Family[]; // Ny
  familyMembers: FamilyMember[]; // Ny
}
