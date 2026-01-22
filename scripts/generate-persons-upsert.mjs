import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('demo-data.json', 'utf8'));
const persons = [...data.persons]
  .sort((a, b) => a.name.localeCompare(b.name, 'no'))
  .slice(0, 60);

const esc = (value) => String(value ?? '').replace(/'/g, "''");
const slugify = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');

const hasAdmin = persons.some((p) => p.is_admin);

const sqlValues = persons
  .map((p, index) => {
    const name = p.name || `Person ${index + 1}`;
    const slug = slugify(name) || `person-${index + 1}`;
    const email = p.email || `${slug}@lmk.no`;
    const phone = p.phone || String(90000000 + index).padStart(8, '9');
    const imageUrl = p.imageUrl || `https://img.lmk.no/u/${slug}.jpg`;
    const birthYear = p.birth_year ?? (p.birth_date ? Number(p.birth_date.slice(0, 4)) : 1980 + (index % 30));
    const birthDate = p.birth_date || `${birthYear}-01-${String((index % 28) + 1).padStart(2, '0')}`;
    const streetAddress = p.streetAddress || `Adresse ${index + 1}`;
    const postalCode = p.postalCode || '4790';
    const city = p.city || 'Lillesand';
    const isAdmin = (p.is_admin ?? false) || (!hasAdmin && index === 0);
    const isActive = p.is_active ?? true;
    const coreRole = p.core_role || (isAdmin ? 'admin' : 'member');
    const ssn = p.social_security_number || String(80000000000 + index).padStart(11, '8');

    return `('${esc(name)}','${esc(email)}','${esc(phone)}','${esc(imageUrl)}','${esc(ssn)}','${birthYear}','${birthDate}','${esc(streetAddress)}','${esc(postalCode)}','${esc(city)}','${isAdmin}','${isActive}','${esc(coreRole)}')`;
  })
  .join(',\n    ');

const sql = `begin;\n\nwith incoming as (\n  select * from (values\n    ${sqlValues}\n  ) as v(\n    name, email, phone, image_url, social_security_number,\n    birth_year, birth_date, street_address, postal_code, city,\n    is_admin, is_active, core_role\n  )\n),\n  typed_incoming as (\n  select\n    name,\n    email,\n    phone,\n    image_url,\n    social_security_number,\n    birth_year::int as birth_year,\n    birth_date::date as birth_date,\n    street_address,\n    postal_code,\n    city,\n    is_admin::boolean as is_admin,\n    is_active::boolean as is_active,\n    core_role::core_role as core_role\n  from incoming\n)\n\ndelete from persons;\n\ninsert into persons (\n  id, name, email, phone, image_url, social_security_number,\n  birth_year, birth_date, street_address, postal_code, city,\n  is_admin, is_active, core_role\n)\nselect\n  gen_random_uuid(), name, email, phone, image_url, social_security_number,\n  birth_year, birth_date, street_address, postal_code, city,\n  is_admin, is_active, core_role\nfrom typed_incoming;\n\ncommit;\n`;

fs.writeFileSync('supabase-persons-upsert.sql', sql, 'utf8');
console.log(`Wrote supabase-persons-upsert.sql with ${persons.length} rows`);
