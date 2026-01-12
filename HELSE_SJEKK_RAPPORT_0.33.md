# HELSESJEKK RAPPORT - EventMaster 0.33

**Dato:** 2025-01-08  
**Versjon:** 0.33  
**Status:** ⚠️ NOEN PROBLEMER FUNNET

---

## 🔴 KRITISKE PROBLEMER

### 1. **PROXY-KONFIGURASJON: Sirkulær proxy**
**Lokasjon:** `vite.config.ts` linje 9-13

**Problem:**
```typescript
server: {
  port: 3000, // Frontend på port 3000
  proxy: {
    '/api': {
      target: 'http://localhost:3000',  // ⚠️ PROXYER TIL SEG SELV!
```

**Forklaring:**
- Frontend kjører på port 3000
- Proxy konfigurert til å sende `/api`-kall til `http://localhost:3000`
- Dette skaper en sirkulær loop: frontend → proxy → samme port → frontend
- Backend må kjøre på en **annen port** (f.eks. 3001) eller proxy må peke til riktig backend-server

**Løsning:**
- Hvis backend kjører på port 3001: `target: 'http://localhost:3001'`
- Hvis backend kjører på samme port (monolith): Fjern proxy og håndter routing i backend
- Alternativ: Flytt frontend til port 5173 og beholde backend på 3000

**Påvirkning:** ⚠️ **HØY** - API-kall vil feile eller gå i loop

---

### 2. **CRYPTO.RANDOMUUID I CONSTANTS.TSX: Runtime-feil**
**Lokasjon:** `constants.tsx` linje 476-555

**Problem:**
```typescript
const generateYearlyWheelTasks = (year: number): Task[] => {
  // ...
  tasks.push(
    { id: crypto.randomUUID(), title: '...', ... },  // ⚠️ Kjøres ved modul-import!
```

**Forklaring:**
- `crypto.randomUUID()` kjøres når modulen lastes (ved import)
- I Node.js-miljø (build-time) kan `crypto` være utilgjengelig eller gi feil UUID-format
- Dette kan føre til at tasks får samme ID hver gang, eller at build feiler

**Løsning:**
- Flytt UUID-generering til runtime (i funksjoner som kalles ved behov)
- Eller bruk en deterministisk UUID-generator basert på tittel + deadline
- Eller generer tasks dynamisk i `getDB()` i stedet for i `constants.tsx`

**Påvirkning:** ⚠️ **MEDIUM** - Kan føre til duplikater eller build-feil

---

### 3. **MANGELENDE ERROR HANDLING I API-KALL**
**Lokasjon:** `components/GroupsView.tsx` linje 422-705

**Problem:**
- API-kall har `try/catch`, men feil håndteres kun med `console.error`
- Ingen brukervennlig feilmelding vises til brukeren
- Fallback til localStorage skjer stille uten bekreftelse

**Eksempel:**
```typescript
} catch (error) {
  console.error('Feil ved opprettelse av familie:', error);
  // ⚠️ Ingen brukervarsel!
}
```

**Løsning:**
- Legg til toast/alert når API feiler og fallback brukes
- Gi brukeren mulighet til å velge mellom "Prøv igjen" eller "Bruk lokalt"

**Påvirkning:** ⚠️ **MEDIUM** - Dårlig brukeropplevelse ved API-feil

---

## 🟡 ADVARSELER OG FORBEDRINGSPUNKTER

### 4. **NAVIGATION KOMPONENT: Placeholder**
**Lokasjon:** `components/Navigation.tsx` linje 32-34

**Problem:**
```typescript
const Navigation = () => {
  return null; // Used only as a placeholder for types in this architecture
};
```

**Forklaring:**
- Komponenten eksisterer men gjør ingenting
- Importeres i `App.tsx` men brukes ikke
- Kan forvirre ved vedlikehold

**Løsning:**
- Enten implementer komponenten eller fjern den
- Hvis den skal brukes senere, legg til `// TODO: Implement navigation`

**Påvirkning:** ℹ️ **LAV** - Ingen funksjonell påvirkning

---

### 5. **PACKAGE.JSON PROXY: Ugyldig for Vite**
**Lokasjon:** `package.json` linje 6

**Problem:**
```json
"proxy": "http://localhost:3000"
```

**Forklaring:**
- `proxy`-feltet i `package.json` er for **Create React App**, ikke Vite
- Vite ignorerer dette feltet
- Proxy må konfigureres i `vite.config.ts` (som allerede er gjort, men feil)

**Løsning:**
- Fjern `proxy` fra `package.json` (det gjør ingenting)
- Fiks proxy i `vite.config.ts` (se problem #1)

**Påvirkning:** ℹ️ **LAV** - Ingen funksjonell påvirkning (ignorert av Vite)

---

### 6. **DATA-FLYT: Tasks merge-logikk**
**Lokasjon:** `db.ts` linje 51-59

**Potensielt problem:**
```typescript
const existingTaskKeys = new Set(
  (parsedData.tasks || []).map(t => `${t.title}-${t.deadline}`)
);
```

**Forklaring:**
- Tasks merges basert på `title + deadline`
- Hvis samme task opprettes flere ganger med samme tittel og deadline, vil den ikke legges til
- Dette kan være ønsket (unngå duplikater) eller uønsket (hvis man vil ha flere instanser)

**Løsning:**
- Vurder om logikken er korrekt for bruksområdet
- Eventuelt bruk `id` i stedet for `title + deadline` hvis tasks skal være unike per ID

**Påvirkning:** ℹ️ **LAV** - Kan være ønsket oppførsel

---

### 7. **IMPORT-REKKEFØLGE: Uorganisert**
**Lokasjon:** `App.tsx` linje 2-21

**Problem:**
- Imports er ikke organisert logisk
- Helper-funksjon (`parseLocalDate`) er definert mellom imports (linje 6-12)
- Burde være: React imports → Type imports → Component imports → Helper functions

**Løsning:**
- Organiser imports etter standard React-konvensjoner
- Flytt helper-funksjoner til toppen av filen eller egen fil

**Påvirkning:** ℹ️ **LAV** - Kodekvalitet, ikke funksjonell

---

## ✅ POSITIVE FUNN

### 8. **INGEN TODO-KOMMENTARER**
- ✅ Ingen `// TODO`, `// FIXME`, eller `// XXX` funnet i koden
- ✅ Ingen placeholder-kommentarer som `// ... existing code`

### 9. **GOOD ERROR HANDLING I API-KALL**
- ✅ `GroupsView.tsx` har try/catch rundt alle API-kall
- ✅ Fallback til localStorage fungerer
- ⚠️ Men mangler brukervarsler (se problem #3)

### 10. **TYPE SAFETY**
- ✅ Ingen `as any` type assertions funnet
- ✅ Ingen `@ts-ignore` eller `@ts-expect-error`
- ✅ TypeScript kompilerer uten feil

### 11. **DATA-FLYT: Folk-komponenten**
- ✅ `GroupsView` er korrekt koblet til `db` via props
- ✅ Data hentes fra `localStorage` via `getDB()`
- ✅ Endringer lagres automatisk via `useEffect` i `App.tsx`

### 12. **IMPORTS: Alle fungerer**
- ✅ Ingen broken imports funnet
- ✅ Alle komponenter eksporteres korrekt
- ✅ Alle typer er tilgjengelige

---

## 📊 SAMMENDRAG

| Kategori | Status | Antall problemer |
|----------|--------|------------------|
| **Kritiske** | 🔴 | 3 |
| **Advarsler** | 🟡 | 4 |
| **Positive** | ✅ | 5 |

### Prioriterte handlinger:

1. **🔴 KRITISK:** Fiks proxy-konfigurasjon i `vite.config.ts`
2. **🔴 KRITISK:** Flytt `crypto.randomUUID()` ut av modul-scope i `constants.tsx`
3. **🟡 MEDIUM:** Legg til brukervarsler ved API-feil i `GroupsView.tsx`
4. **🟡 LAV:** Fjern ugyldig `proxy` fra `package.json`
5. **🟡 LAV:** Organiser imports i `App.tsx`

---

## 🎯 ANBEFALTE ENDRINGER (IKKE UTFØRT)

### Endring 1: Fiks proxy-konfigurasjon
```typescript
// vite.config.ts
proxy: {
  '/api': {
    target: 'http://localhost:3001',  // Backend på annen port
    // ELLER hvis monolith:
    // target: 'http://localhost:3000',
    // configure: (proxy, _options) => {
    //   proxy.on('error', (err, _req, _res) => {
    //     console.log('proxy error', err);
    //   });
    // }
  }
}
```

### Endring 2: Flytt UUID-generering
```typescript
// constants.tsx
const generateYearlyWheelTasks = (year: number): Task[] => {
  const tasks: Task[] = [];
  // Bruk en deterministisk ID-generator:
  const generateId = (title: string, deadline: string) => {
    // Hash av title + deadline for konsistente IDer
    return `task-${btoa(title + deadline).slice(0, 16)}`;
  };
  
  tasks.push(
    { id: generateId('Rapportere trossamfunnsstatistikk', dateStr(0, 15)), ... }
  );
  // ...
}
```

### Endring 3: Legg til brukervarsler
```typescript
// GroupsView.tsx
} catch (error) {
  console.error('Feil ved opprettelse av familie:', error);
  alert('Kunne ikke koble til server. Data lagres lokalt i nettleseren.');
  // Eller bruk en toast-bibliotek
}
```

---

**Rapport generert:** 2025-01-08  
**Neste sjekk anbefalt:** Etter implementering av kritiske endringer


