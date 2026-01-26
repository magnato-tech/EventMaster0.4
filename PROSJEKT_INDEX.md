# EventMaster LMK - Prosjektindeks

## 📋 Oversikt
EventMaster LMK er en React-basert webapplikasjon for administrasjon av gudstjenester, bemanning, grupper og kommunikasjon for en menighet. Applikasjonen bruker localStorage for datalagring og er bygget med TypeScript, React 19 og Vite.

## 🏗️ Prosjektstruktur

```
EventMaster0.6/
├── App.tsx                    # Hovedkomponent med routing, state management og sync-valg
├── index.tsx                  # React entry point
├── types.ts                   # TypeScript type definitions
├── db.ts                      # Database/logic layer (localStorage med backup-støtte)
├── constants.tsx              # Tom starttilstand (EMPTY_DATA)
├── vite.config.ts             # Vite konfigurasjon
├── tsconfig.json              # TypeScript konfigurasjon
├── package.json               # Dependencies og scripts
├── index.html                 # HTML entry point
├── master_data_backup.json    # Eksport/Import backup-fil
├── scripts/
│   ├── seed.ts                # Supabase seed
│   ├── seedData.ts            # Testdata for seed
│   └── seedLocal.ts           # Skriver seed til master_data_backup.json
├── lib/
│   ├── supabase.ts            # Supabase konfigurasjon
│   ├── supabaseClient.ts      # Supabase klient instans
│   └── supabaseSync.ts        # Logikk for synkronisering til Supabase
└── components/
    ├── Dashboard.tsx          # Brukerens vaktliste og oversikt
    ├── DashboardView.tsx      # Statistikk-dashboard med grafer
    ├── CalendarView.tsx       # Kalendervisning og planlegging
    ├── GroupsView.tsx         # Grupper, personer og familiestruktur
    ├── YearlyWheelView.tsx    # Årshjul med administrative frister
    ├── CommunicationView.tsx  # Meldinger og systemvarsler
    ├── MasterMenu.tsx         # Master-oppsett (gul sone)
    ├── IdentityPicker.tsx     # Brukervelger ved oppstart
    ├── Navigation.tsx         # Navigasjonskomponent (desktop/mobile)
    ├── PersonAvatar.tsx       # Avatar-komponent
    ├── SettingsTab.tsx        # Innstillinger (nytt i 0.6)
    └── SettingsView.tsx       # Innstillinger (deprecated/erstattet av SettingsTab)
```

## 🛠️ Teknologier

### Core
- **React 19.2.3** - UI framework
- **TypeScript 5.8.2** - Type safety
- **Vite 6.2.0** - Build tool og dev server
- **Tailwind CSS** (via CDN) - Styling
- **Lucide React** - Ikonbibliotek

### Lagring & Sync
- **localStorage** - Hovedlagring i nettleser (`eventmaster_lmk_db`)
- **Supabase** - Valgfri sky-synkronisering (nytt i 0.6)
- **JSON Backup** - Støtte for eksport/import via `master_data_backup.json`

## 📦 Hovedkomponenter

### App.tsx
Hovedkomponent som håndterer:
- Global state management (AppState)
- Brukerautentisering (IdentityPicker)
- Routing mellom views (tabs)
- Event handlers for CRUD-operasjoner
- Automatisk synkronisering av bemanning fra programposter
- Varslingssystem for endringer

**Viktige funksjoner:**
- `syncStaffingAndNotify()` - Synkroniserer bemanning fra programposter og logger endringer
- `autoFillOccurrence()` - Auto-utfyller personer basert på gruppeledere
- `handleCreateOccurrence()` - Oppretter nye arrangementer
- `handleCreateRecurringOccurrences()` - Oppretter gjentakende arrangementer

### Dashboard.tsx
Brukerens personlige dashboard som viser:
- Mine Oppgaver (assignments og program items)
- Mine grupper
- Viktige frister (tasks)
- Statistikk (personer, tjeneste, barn/unge)
- Detaljvisning av arrangementer med kjøreplan og instrukser

### CalendarView.tsx
Kalendervisning med to moduser:
- **List view**: Liste over alle arrangementer
- **Calendar view**: Månedlig kalendervisning

Funksjonalitet:
- Opprette/redigere/slette arrangementer
- Administrere kjøreplan (program items) med drag & drop
- Bemanningsliste (auto-synkronisert fra programposter)
- Endringslogg (change logs)
- Tema og bibbelord for arrangementer

### GroupsView.tsx
Administrasjon av:
- Personer (med familieinformasjon)
- Grupper (Service, Fellowship, Strategy, Barnekirke)
- Gruppemedlemmer og roller
- Service roles og instrukser

### YearlyWheelView.tsx
Årshjul for administrative frister:
- Månedlig visning av globale tasks
- Opprette/redigere/slette frister
- Tilknyttet ansvarlig person

### CommunicationView.tsx
Kommunikasjonssystem:
- Systemvarsler (automatiske varsler ved bemanningsendringer)
- Manuelle meldinger mellom roller
- Rollbasert tilgang (Pastor, Admin, Team Leader)

### MasterMenu.tsx
Admin-verktøy for:
- Event templates (maler for arrangementer)
- Master-program (gul sone - template-basert)
- Opprette gjentakende arrangementer
- Synkronisering mellom master og occurrences

## 📊 Datamodell

### Core Types (types.ts)

#### Person
```typescript
{
  id: UUID
  name: string
  email?: string
  phone?: string
  is_admin: boolean
  is_active: boolean
  core_role: CoreRole (ADMIN, PASTOR, TEAM_LEADER, MEMBER, GUEST)
  birth_year?: number
  birth_date?: string
  // Adresse-felter
}
```

#### Group
```typescript
{
  id: UUID
  name: string
  category: GroupCategory (SERVICE, FELLOWSHIP, STRATEGY, BARNKIRKE)
  description?: string
  parent_id?: UUID
  gathering_pattern?: GatheringPattern
}
```

#### EventOccurrence
```typescript
{
  id: UUID
  template_id: UUID | null
  date: string (YYYY-MM-DD)
  time?: string (HH:mm)
  title_override?: string
  theme?: string
  bible_verse?: string
  status: OccurrenceStatus (DRAFT, PUBLISHED)
  last_synced_at?: string
}
```

#### ProgramItem
```typescript
{
  id: UUID
  template_id?: UUID | null  // null = occurrence-spesifikk
  occurrence_id?: UUID | null // null = template-spesifikk
  title: string
  duration_minutes: number
  service_role_id?: UUID | null
  group_id?: UUID | null
  person_id?: UUID | null
  order: number
  description?: string
}
```

#### Assignment
```typescript
{
  id: UUID
  occurrence_id?: UUID | null
  template_id?: UUID | null
  service_role_id: UUID
  person_id?: UUID | null
  display_order?: number
}
```

#### Task
```typescript
{
  id: UUID
  occurrence_id?: UUID | null
  template_id?: UUID | null
  title: string
  deadline: string (YYYY-MM-DD)
  responsible_id: UUID
  is_global: boolean
}
```

#### NoticeMessage
```typescript
{
  id: UUID
  sender_id: UUID | 'system'
  recipient_role: CoreRole
  title: string
  content: string
  created_at: string
  occurrence_id?: UUID
}
```

#### Family & FamilyMember
Støtter familiestruktur med:
- Family: Familieenhet med adresse
- FamilyMember: Kobling mellom person og familie med rolle (PARENT, CHILD, PARTNER, GUARDIAN)

### AppState
Global state som inneholder arrays av alle entities:
- persons, groups, groupMembers
- serviceRoles, groupServiceRoles
- eventTemplates, eventOccurrences
- assignments, programItems
- tasks, noticeMessages, changeLogs
- families, familyMembers

## 🔄 Viktige funksjoner

### Automatisk bemanningssynkronisering
Når programposter oppdateres, synkroniseres bemanningslisten automatisk:
1. Programposter med `service_role_id` og `person_id` genererer assignments
2. Endringer logges i `changeLogs`
3. Systemmeldinger sendes til relevante roller

### Bulk Copy (performBulkCopy)
Når et nytt arrangement opprettes fra en template:
1. Programposter kopieres fra template til occurrence
2. Assignments genereres fra programposter
3. Manuelle assignments kopieres
4. Tasks kopieres

### Auto-fill
Basert på gruppeledere:
- Hvis en rolle er knyttet til en gruppe via `groupServiceRoles`
- Og gruppen har en leder i `groupMembers`
- Foreslås lederen automatisk ved tildeling

### Recurring Occurrences
Støtter opprettelse av gjentakende arrangementer:
- **Weekly**: Hver N uke
- **Monthly**: N-te ukedag i måneden (f.eks. 1. søndag)

## 🎨 UI/UX Features

### Design System
- **Fargepalett**: Indigo (primary), Slate (neutral), Emerald (success), Rose (danger)
- **Typography**: Inter font, uppercase tracking for labels
- **Spacing**: Konsistent padding/margin system
- **Responsive**: Mobile-first med breakpoints

### Navigasjon
- Desktop: Sidebar med ikoner
- Mobile: Bottom navigation bar
- Tab-basert routing

### Modaler
- Slide-in panels for detaljvisning
- Overlay modals for forms
- Backdrop blur effects

## 💾 Datalagring

### localStorage
- Key: `eventmaster_lmk_db`
- JSON-serialisert AppState
- Auto-save ved state-endringer
- Fallback til `EMPTY_DATA` hvis tom

### Initial Data (constants.tsx)
- `EMPTY_DATA`: Tom starttilstand uten testdata

### Seed Data (scripts/seedData.ts)
- `INITIAL_DATA`: Basis data med eksempelpersoner, grupper, roller
- `POPULATED_DATA`: Utvidet med familier og årshjul-tasks
- `populateFamilyData()`: Funksjon som legger til familiedata
- `generateYearlyWheelTasks()`: Genererer årlige administrative frister

## 🔐 Tilgangskontroll

### Core Roles
- **ADMIN**: Full tilgang, inkludert Master-oppsett
- **PASTOR**: Kan se alle meldinger, administrere kalender
- **TEAM_LEADER**: Kan se team-meldinger, administrere egne grupper
- **MEMBER**: Lesetilgang til egne vakter
- **GUEST**: Begrenset tilgang

### Group Roles
- **LEADER**: Gruppeleder
- **DEPUTY_LEADER**: Nestleder
- **MEMBER**: Medlem

## 📝 Viktige konvensjoner

### Dato-håndtering
- Alle datoer lagres som `YYYY-MM-DD` strings
- Bruker lokal tid (Berlin time) via `parseLocalDate()` og `formatLocalDate()`
- Ingen timezone-konvertering

### UUID-generering
- Bruker `crypto.randomUUID()` for nye entities
- Tasks bruker deterministisk hash-basert ID for å unngå duplikater

### State Management
- Lokal state i komponenter med `useState`
- Global state i App.tsx med `useState<AppState>`
- Props drilling for event handlers
- `useMemo` for beregnede verdier

## 🚀 Scripts

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build
npm run preview  # Preview production build
```

## 📌 Notater

### Synkronisering
- Bemanning synkroniseres automatisk fra programposter
- Manuelle assignments kan også legges til
- Synkronisering skjer via `syncStaffingAndNotify()`

### Program vs Assignments
- **ProgramItems**: Kjøreplan med tidslinje
- **Assignments**: Bemanningsliste (kan være avledet fra program)
- En rolle kan ha flere personer (display_order: 1, 2, 3...)

### Master vs Occurrence
- **Master (Yellow Zone)**: Template-basert, gjelder alle fremtidige occurrences
- **Occurrence (White Zone)**: Spesifikk for ett arrangement
- Bulk copy kopierer fra master til occurrence ved opprettelse

## 🔍 Søkeord for utvikling

- Bemanning: `assignments`, `syncStaffingAndNotify`
- Program: `programItems`, `order`, `duration_minutes`
- Kalender: `eventOccurrences`, `parseLocalDate`
- Grupper: `groups`, `groupMembers`, `serviceRoles`
- Kommunikasjon: `noticeMessages`, `changeLogs`
- Tasks: `tasks`, `is_global`, `deadline`
- Familie: `families`, `familyMembers`

