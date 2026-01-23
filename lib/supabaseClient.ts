import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined);
const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined);

export const supabaseTables = {
  persons:
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_TABLE_PERSONS) ||
    'persons',
  groups:
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_TABLE_GROUPS) ||
    'groups',
  groupMembers:
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_TABLE_GROUP_MEMBERS) ||
    'group_members'
};

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;



