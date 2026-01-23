import { AppState, Group, GroupMember, Person } from '../types';
import { supabase, supabaseTables } from './supabaseClient';

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let isSyncing = false;
let lastSyncedIds: {
  persons: Set<string>;
  groups: Set<string>;
  groupMembers: Set<string>;
} | null = null;

const chunk = <T,>(items: T[], size = 500): T[][] => {
  const buckets: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    buckets.push(items.slice(i, i + size));
  }
  return buckets;
};

const toSupabasePerson = (person: Person) => ({
  id: person.id,
  name: person.name,
  email: person.email || null,
  phone: person.phone || null,
  image_url: person.imageUrl || null,
  social_security_number: person.social_security_number || null,
  birth_year: person.birth_year ?? (person.birth_date ? Number(person.birth_date.slice(0, 4)) : null),
  birth_date: person.birth_date || null,
  street_address: person.streetAddress || null,
  postal_code: person.postalCode || null,
  city: person.city || null,
  is_admin: Boolean(person.is_admin),
  is_active: person.is_active !== false,
  core_role: person.core_role || 'member'
});

const toSupabaseGroup = (group: Group) => ({
  id: group.id,
  name: group.name,
  category: group.category,
  description: group.description || null,
  link: group.link || null,
  parent_id: group.parent_id || null,
  gathering_pattern: group.gathering_pattern || null,
  leader_id: group.leaderId || null,
  deputy_id: group.deputyId || null
});

const toSupabaseGroupMember = (member: GroupMember) => ({
  id: member.id,
  group_id: member.group_id,
  person_id: member.person_id,
  role: member.role,
  service_role_id: member.service_role_id || null
});

const runSync = async (state: AppState) => {
  if (!supabase || isSyncing) return;
  isSyncing = true;
  try {
    const personsPayload = state.persons.map(toSupabasePerson);
    const groupsPayload = state.groups.map(toSupabaseGroup);
    const membersPayload = state.groupMembers.map(toSupabaseGroupMember);

    const currentIds = {
      persons: new Set(state.persons.map(p => p.id)),
      groups: new Set(state.groups.map(g => g.id)),
      groupMembers: new Set(state.groupMembers.map(gm => gm.id))
    };

    const [personsResult, groupsResult, membersResult] = await Promise.all([
      supabase.from(supabaseTables.persons).upsert(personsPayload, { onConflict: 'id' }),
      supabase.from(supabaseTables.groups).upsert(groupsPayload, { onConflict: 'id' }),
      supabase.from(supabaseTables.groupMembers).upsert(membersPayload, { onConflict: 'id' })
    ]);

    if (personsResult.error || groupsResult.error || membersResult.error) {
      console.warn('Supabase sync failed', {
        persons: personsResult.error,
        groups: groupsResult.error,
        groupMembers: membersResult.error
      });
    }

    if (lastSyncedIds) {
      const removedPersonIds = [...lastSyncedIds.persons].filter(id => !currentIds.persons.has(id));
      const removedGroupIds = [...lastSyncedIds.groups].filter(id => !currentIds.groups.has(id));
      const removedMemberIds = [...lastSyncedIds.groupMembers].filter(id => !currentIds.groupMembers.has(id));

      const deleteOps: Promise<any>[] = [];
      chunk(removedPersonIds).forEach(ids => {
        deleteOps.push(supabase.from(supabaseTables.persons).delete().in('id', ids));
      });
      chunk(removedGroupIds).forEach(ids => {
        deleteOps.push(supabase.from(supabaseTables.groups).delete().in('id', ids));
      });
      chunk(removedMemberIds).forEach(ids => {
        deleteOps.push(supabase.from(supabaseTables.groupMembers).delete().in('id', ids));
      });

      if (deleteOps.length > 0) {
        const results = await Promise.all(deleteOps);
        const deleteErrors = results.map(r => r.error).filter(Boolean);
        if (deleteErrors.length > 0) {
          console.warn('Supabase delete failed', deleteErrors);
        }
      }
    }

    lastSyncedIds = currentIds;
  } catch (error) {
    console.warn('Supabase sync error', error);
  } finally {
    isSyncing = false;
  }
};

export const queueSupabaseSync = (state: AppState, delayMs = 800) => {
  if (!supabase) return;
  if (syncTimer) {
    clearTimeout(syncTimer);
  }
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void runSync(state);
  }, delayMs);
};
