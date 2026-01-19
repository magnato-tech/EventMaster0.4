# Instruksjoner for å eksportere personer og grupper

## Metode 1: Browser Console (Anbefalt og enklest)

1. Åpne EventMaster-appen i nettleseren: **http://localhost:3000**
2. Åpne Developer Tools (trykk **F12**)
3. Gå til **Console**-fanen
4. Kopier og lim inn følgende kommando:

```javascript
downloadPersonsAndGroups()
```

Dette vil:
- ✅ Eksportere alle personer og grupper fra localStorage
- ✅ Automatisk laste ned filen `master_data_backup.json`
- ✅ Vise informasjon i console om antall personer og grupper

## Metode 2: Eksporter uten automatisk nedlasting

Hvis du bare vil se dataene i console først:

```javascript
const data = exportPersonsAndGroups();
console.log(JSON.stringify(data, null, 2));
```

## Metode 3: Bruk export_data.html

1. Åpne filen `export_data.html` i nettleseren
2. Klikk på "Eksporter Data"-knappen
3. Filen lastes automatisk ned

## Hva eksporteres?

Filen `master_data_backup.json` inneholder:
- **persons**: Alle personer i systemet
- **groups**: Alle grupper i systemet  
- **exportDate**: Når eksporten ble gjort (ISO-format)
- **version**: Versjon av systemet (0.4)

## Eksempel på struktur

```json
{
  "persons": [
    {
      "id": "p1",
      "name": "Navn Navnesen",
      "email": "navn.navnesen@lmk.no",
      ...
    }
  ],
  "groups": [
    {
      "id": "g1",
      "name": "Gruppenavn",
      "category": "service",
      ...
    }
  ],
  "exportDate": "2025-01-XX...",
  "version": "0.4"
}
```

## Notater

- Dataene hentes fra browser localStorage (nøkkel: `eventmaster_lmk_db`)
- Hvis localStorage er tom, brukes INITIAL_DATA fra constants.tsx
- Eksporten inkluderer kun personer og grupper, ikke andre data som events, tasks, etc.





