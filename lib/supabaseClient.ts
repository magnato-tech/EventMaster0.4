import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfig = {
  tables: {
    persons: (import.meta.env.VITE_SUPABASE_TABLE_PERSONS as string | undefined) || 'persons',
    groups: (import.meta.env.VITE_SUPABASE_TABLE_GROUPS as string | undefined) || 'groups',
    groupMembers: (import.meta.env.VITE_SUPABASE_TABLE_GROUP_MEMBERS as string | undefined) || 'group_members'
  }
};

export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;




