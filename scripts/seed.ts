import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { POPULATED_DATA } from "./seedData";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local."
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const groups = POPULATED_DATA.groups.map((group) => ({
  id: group.id,
  name: group.name,
  category: group.category,
  description: group.description ?? null,
  link: group.link ?? null,
  parent_id: group.parent_id ?? null,
  gathering_pattern: group.gathering_pattern ?? null,
  leader_id: group.leaderId ?? null,
  deputy_id: group.deputyId ?? null,
}));

const serviceRoles = POPULATED_DATA.serviceRoles.map((role) => ({
  id: role.id,
  name: role.name,
  description: role.description ?? null,
  default_instructions: role.default_instructions ?? [],
  is_active: role.is_active,
}));

const eventTemplates = POPULATED_DATA.eventTemplates.map((template) => ({
  id: template.id,
  title: template.title,
  type: template.type,
  recurrence_rule: template.recurrence_rule,
  color: template.color ?? null,
}));

const eventOccurrences = POPULATED_DATA.eventOccurrences.map((occurrence) => ({
  id: occurrence.id,
  template_id: occurrence.template_id ?? null,
  date: occurrence.date,
  time: occurrence.time ?? null,
  title_override: occurrence.title_override ?? null,
  theme: occurrence.theme ?? null,
  bible_verse: occurrence.bible_verse ?? null,
  status: occurrence.status,
  last_synced_at: occurrence.last_synced_at ?? null,
  color: occurrence.color ?? null,
}));

const upsertRows = async (table: string, rows: Record<string, unknown>[]) => {
  if (rows.length === 0) {
    console.log(`Skipping ${table} (no rows).`);
    return;
  }

  const { error } = await supabase.from(table).upsert(rows, {
    onConflict: "id",
  });

  if (error) {
    throw new Error(`Upsert failed for ${table}: ${error.message}`);
  }

  console.log(`Upserted ${rows.length} rows into ${table}.`);
};

const run = async () => {
  await upsertRows("groups", groups);
  await upsertRows("service_roles", serviceRoles);
  await upsertRows("event_templates", eventTemplates);
  await upsertRows("event_occurrences", eventOccurrences);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});



