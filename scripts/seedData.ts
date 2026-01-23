import { AppState, GroupCategory, GroupRole, CoreRole, Person, Family, FamilyMember, FamilyRole, ServiceRole, GroupMember, GroupServiceRole, UUID, Task } from '../types';

// Hjelpefunksjon for å generere tilfeldig fødselsdato i et gitt år
const generateRandomBirthDate = (year: number): string => {
  // Generer tilfeldig måned (1-12)
  const month = Math.floor(Math.random() * 12) + 1;
  // Generer tilfeldig dag (1-28 for å unngå problemer med måneder med færre dager)
  const day = Math.floor(Math.random() * 28) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// Hjelpefunksjon for å generere fødselsdato basert på alder
const generateBirthDateFromAge = (age: number): string => {
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - age;
  return generateRandomBirthDate(birthYear);
};

// Geografisk fordeling basert på Lillesand Misjonskirke
const LOCATIONS = {
  lillesand: {
    postalCode: '4790',
    city: 'Lillesand',
    streets: ['Storgata', 'Strandgata', 'Skoleveien', 'Brentemoen'],
    probability: 0.70
  },
  hovag: {
    postalCode: '4770',
    city: 'Høvåg',
    streets: ['Høvågveien', 'Vestre Vallesverd', 'Indre Årsnes'],
    probability: 0.10
  },
  birkeland: {
    postalCode: '4760',
    city: 'Birkeland',
    streets: ['Strøget', 'Tveideveien', 'Nordåsveien'],
    probability: 0.10
  },
  grimstad: {
    postalCode: '4876',
    city: 'Grimstad',
    streets: ['Storgaten', 'Vestregate', 'Grooseveien'],
    probability: 0.10
  }
};

// Hjelpefunksjon for å velge tilfeldig lokasjon basert på sannsynlighet
const getRandomLocation = () => {
  const rand = Math.random();
  if (rand < LOCATIONS.lillesand.probability) return LOCATIONS.lillesand;
  if (rand < LOCATIONS.lillesand.probability + LOCATIONS.hovag.probability) return LOCATIONS.hovag;
  if (rand < LOCATIONS.lillesand.probability + LOCATIONS.hovag.probability + LOCATIONS.birkeland.probability) return LOCATIONS.birkeland;
  return LOCATIONS.grimstad;
};

// Hjelpefunksjon for å generere fullstendig adresse
const generateAddress = () => {
  const location = getRandomLocation();
  const street = location.streets[Math.floor(Math.random() * location.streets.length)];
  const streetNumber = Math.floor(Math.random() * 50) + 1; // 1-50
  return {
    streetAddress: `${street} ${streetNumber}`,
    postalCode: location.postalCode,
    city: location.city
  };
};

// Hjelpefunksjon for å generere norsk mobilnummer (8 siffer)
const generatePhoneNumber = (): string => {
  const prefix = ['9', '4', '8'][Math.floor(Math.random() * 3)]; // 9, 4 eller 8
  const digits = Array.from({ length: 7 }, () => Math.floor(Math.random() * 10)).join('');
  return `${prefix}${digits}`;
};

// Hjelpefunksjon for å generere email fra navn
const generateEmail = (name: string): string => {
  const parts = name.toLowerCase().split(' ');
  if (parts.length >= 2) {
    return `${parts[0]}.${parts[parts.length - 1]}@lmk.no`;
  }
  return `${parts[0]}@lmk.no`;
};

// Hjelpefunksjon for å generere adresse med spesifikk lokasjon
const generateAddressForLocation = (location: typeof LOCATIONS.lillesand) => {
  const street = location.streets[Math.floor(Math.random() * location.streets.length)];
  const streetNumber = Math.floor(Math.random() * 50) + 1;
  return {
    streetAddress: `${street} ${streetNumber}`,
    postalCode: location.postalCode,
    city: location.city
  };
};

// Liste med norske fornavn og etternavn for realistiske navn
const FIRST_NAMES = [
  'Anders', 'Lise', 'Tom', 'Per', 'Morten', 'Lars', 'Kari', 'Erik', 'Ingrid', 'Ole',
  'Anne', 'Bjørn', 'Marit', 'Svein', 'Hanne', 'Jan', 'Liv', 'Geir', 'Tone', 'Arne',
  'Mari', 'Thomas', 'Silje', 'Magnus', 'Camilla', 'Henrik', 'Nina', 'Martin', 'Heidi', 'Andreas',
  'Kristin', 'Daniel', 'Marte', 'Jon', 'Vilde', 'Espen', 'Siri', 'Stian', 'Emma', 'Lukas'
];

const LAST_NAMES = [
  'Hansen', 'Johansen', 'Olsen', 'Larsen', 'Andersen', 'Pedersen', 'Nilsen', 'Kristiansen',
  'Jensen', 'Karlsen', 'Berg', 'Haugen', 'Dahl', 'Bakke', 'Solberg', 'Eriksen', 'Haugland',
  'Moe', 'Strand', 'Lunde', 'Holm', 'Aas', 'Sørensen', 'Myklebust', 'Vik', 'Sandvik', 'Lie'
];

export const DEMO_MAX_PEOPLE = 200;

export const generatePersons = (
  count: number,
  startIndex = 1,
  makeFirstAdmin = false,
  minAge = 5,
  maxAge = 74
): Person[] => {
  const persons: Person[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < count; i += 1) {
    const location = getRandomLocation();
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    let fullName = `${firstName} ${lastName}`;
    let suffix = 2;
    while (usedNames.has(fullName)) {
      fullName = `${firstName} ${lastName} ${suffix}`;
      suffix += 1;
    }
    usedNames.add(fullName);

    const ageRange = Math.max(0, maxAge - minAge);
    const age = Math.floor(Math.random() * (ageRange + 1)) + minAge;
    const birthYear = new Date().getFullYear() - age;
    const address = generateAddressForLocation(location);

    persons.push({
      id: `p${startIndex + i}`,
      name: fullName,
      email: generateEmail(fullName),
      phone: generatePhoneNumber(),
      birth_year: birthYear,
      birth_date: generateRandomBirthDate(birthYear),
      streetAddress: address.streetAddress,
      postalCode: address.postalCode,
      city: address.city,
      is_admin: makeFirstAdmin && i === 0,
      is_active: true,
      core_role: makeFirstAdmin && i === 0 ? CoreRole.ADMIN : CoreRole.MEMBER
    });
  }

  return persons;
};

const SINGLE_ADULT_COUNT = 20;
const FAMILY_COUNT = 20;

// Generer 20 voksne singler (admin inkludert)
const generatedPersons = generatePersons(SINGLE_ADULT_COUNT, 1, true, 19, 75);

export const INITIAL_DATA: AppState = {
  persons: generatedPersons,
  groups: [],
  groupMembers: [],
  serviceRoles: [
    {
      id: 'sr1',
      name: 'Møteleder',
      default_instructions: [
        'Snakke med taler om tema',
        'Lytte til Gud og finne ut hvor du vil med gudstjenesten',
        'Ha dialog med lovsangsleder om setliste',
        'Sy sammen gudstjenesten og lage en kjøreplan',
        'Spørre Lars eller Magnar om en av de kan forrette nattverden og lyse velsignelsen, evt. finne noen andre som kan gjøre det',
        'Være med på å dele ut nattverden eller finne noen andre til å gjøre det',
        'Sette deg inn i søndagens info og kollekt (Dette får du tilsendt fredag før gudstjenesten?)',
        'Eventuelt lage ekstra bønnevandringsposter hvis du vil (Snakk med møtevert)',
        'Forberede deg åndelig',
        'Lede bønnemøtet på søndag kl. 10.00 - 10.45. Sett Gud på tronen, vær i bønn og bruk gjerne lovsang (Kl. 10.30 kommer de andre som skal bidra i gudstjenesten for å være med å be)',
        'Ha en gjennomgang av gudstjenesten med taler, lovsangsleder og teknikere kl. 10.45',
        'Ha skrevet ut en kjøreplan som deles ut, slik at alle vet hva som skjer når',
        'Holde styr på tida og si ifra til lovsangsleder at de skal begynne gudstjenesten',
        'Lede menigheten gjennom gudstjenesten (Bli leda av Gud, observere menigheten. Vær åpen for at kjøreplanen kan endres underveis - i samarbeid med lovsangsleder)',
        'Legge til rette for å sitte igjen i salen når gudstjenesten er ferdig hvis du ønsker det',
        'Ansvar for: Velkommen, bønn, søndagens info, informere om nattverd/bønnevandring, kollekt, avslutning/sendelse, kirkekaffe',
        'Eventuelt ansvar for: Bibellesning, vitnesbyrd, bønn for taleren, stillhet/delestund o.l.'
      ],
      is_active: true
    },
    {
      id: 'sr2',
      name: 'Taler',
      default_instructions: [
        'Lage preken og forberede deg åndelig',
        'Ta kontakt med møteleder og lovsangsleder om tema',
        'Sende eventuell PowerPoint eller annet som skal opp på skjermen til bildetekniker i god tid',
        'Møte opp senest kl. 10.00 for å være med på bønnemøtet',
        'Være med på gjennomgang av gudstjenesten kl. 10.45',
        'Holde preken'
      ],
      is_active: true
    },
    {
      id: 'sr3',
      name: 'Forbønn',
      default_instructions: [
        'Forberede deg åndelig',
        'Være med og be på bønnemøtet søndag før gudstjenesten kl. 10.00 - 10.45',
        'Be for dem som ønsker det under gudstjenesten (Etter nattverden)',
        'Bli igjen i salen litt etter møtet er ferdig for å se om noen vil bli bedt for'
      ],
      is_active: true
    },
    {
      id: 'sr4',
      name: 'Barnekirke',
      default_instructions: [
        'Rigge klart det du trenger til opplegget du skal ha',
        'Finne frem tegnesaker til barna på et av bordene i møtesalen',
        'Eventuelt samarbeide med møtevert/gudstjenesteleder om bønnestasjon tilpasset barna',
        'Husk at du må ha hentet alt du trenger før kl. 10.00 (For å ikke forstyrre bønnemøtet)',
        'Bli med på bønnemøtet kl. 10.30 (Du kan gjerne komme fra kl. 10.00)',
        'Være med på gjennomgang av gudstjenesten kl. 10.45',
        'Ha samling/undervisning med barna under talen',
        'Sørge for at barna er tilbake i møtesalen innen nattverden',
        'Rigge ned alt du har rigga opp'
      ],
      is_active: true
    },
    {
      id: 'sr5',
      name: 'Lovsang',
      default_instructions: [
        'Passe på at du får med deg iPadene hjem fra gudstjenesten',
        'Ta kontakt med taler og møteleder om tema og visjon for gudstjenesten',
        'Lage setliste, fikse blekker i riktig toneart og sende til teamet (Senest 5 dager før)',
        'Organisere øving og oppmøtetidspunkt på søndagen',
        'Ta kontakt med lydmann om oppmøte (Senest lørdag ettermiddag)',
        'Sende setliste til bildetekniker i god tid (Si ifra om nye sanger)',
        'Forberede deg åndelig (Lovsynge, be, lese Bibelen, lytte til Gud)',
        'Sørge for at iPadene er ladet opp med riktige blekker',
        'Kunne sangene godt nok til å lede teamet og salen inn i tilbedelse',
        'Være ferdig med øving senest kl. 10.30 for å delta på bønnemøtet',
        'Være med på gjennomgang av gudstjenesten kl. 10.45',
        'Lede menigheten i lovsang (Være åpen for endringer i samarbeid med møteleder)'
      ],
      is_active: true
    },
    {
      id: 'sr6',
      name: 'Lyd',
      default_instructions: [
        'Møte opp søndag morgen etter avtale med lovsangsleder',
        'Ta ansvar for linjesjekk og lydprøve',
        'Bli med på bønnemøtet kl. 10.30 (Gjerne fra kl. 10.00)',
        'Være med på gjennomgang av gudstjenesten kl. 10.45',
        'Styre lyden aktivt (Lytte og følge med på tegn fra teamet)',
        'Sette på rolig lovsang i det gudstjenesten er ferdig'
      ],
      is_active: true
    },
    {
      id: 'sr7',
      name: 'Bilde',
      default_instructions: [
        'Møte opp på søndag senest kl. 10.00',
        'Gjøre deg kjent med setlista og forberede eventuelle endringer',
        'Gjøre deg kjent med info, videoer eller PowerPoint som skal vises',
        'Bli med på bønnemøtet kl. 10.30 (Gjerne fra kl. 10.00)',
        'Være med på gjennomgang av gudstjenesten kl. 10.45',
        'Styre tekst og alt visuelt innhold under gudstjenesten'
      ],
      is_active: true
    },
    {
      id: 'sr8',
      name: 'Rigging',
      default_instructions: [
        'Rigge opp og ned kirkekaffebordene',
        'Ta kontakt med lovsangsleder om hvilke instrumenter som skal rigges',
        'Rigge opp og ned scenen (Detaljer avklares med Lars)'
      ],
      is_active: true
    },
    {
      id: 'sr9',
      name: 'Møtevert',
      default_instructions: [
        'Rigge klart nattverdsbordet (Duk, glass, juice, oblater, brett til brukte glass)',
        'Rigge opp faste bønneposter (Lysgloben, korset med byrdesteiner)',
        'Eventuelt rigge andre bønneposter etter avtale med møteleder',
        'Sjekke at det er nok små lys til globen',
        'Hent alt utstyr før kl. 10.00 (For å ikke forstyrre bønnemøtet)',
        'Bli med på bønnemøtet kl. 10.30',
        'Ønske velkommen i døra fra kl. 10.45 til kl. 11.15',
        'Rydde nattverdsglass ut på kjøkkenet etter nattverden',
        'Slukke levende lys og rigge ned utstyr etter gudstjenesten'
      ],
      is_active: true
    },
    {
      id: 'sr10',
      name: 'Kjøkken',
      default_instructions: [
        'Koke kaffe og tevann ferdig senest kl. 10.45',
        'Sette frem te, kakao, saft, vann og twist/annet godt',
        'Sette frem all mat og kaker til kirkekaffen',
        'Ta ansvar for oppvask etter kirkekaffen',
        'Se over salen for brukte kopper og nattverdsglass når møtet er ferdig',
        'Rydde på plass alt utstyr'
      ],
      is_active: true
    },
    {
      id: 'sr11',
      name: 'Baking',
      default_instructions: [
        'Bake kake(r) og ta med til gudstjenesten',
        'Koordiner med kjøkkenansvarlig for den aktuelle søndagen'
      ],
      is_active: true
    },
    {
      id: 'sr12',
      name: 'Pynting',
      default_instructions: [
        'Pynte nattverdsbordet (Lys og blomst)',
        'Pynte bordene i kirkekafferommet og baren ved miksepulten',
        'Tenne lys (Nattverdsbord, lysglobe, kirkekafferom)',
        'Slukke levende lys når gudstjenesten er over',
        'Rigge ned pynt og rydde opp'
      ],
      is_active: true
    }
  ],
  groupServiceRoles: [
    { id: 'gsr1', group_id: 'g4', service_role_id: 'sr1', is_active: true },
    { id: 'gsr2', group_id: 'g4', service_role_id: 'sr2', is_active: true },
    { id: 'gsr3', group_id: 'g1', service_role_id: 'sr5', is_active: true },
    { id: 'gsr4', group_id: 'g3', service_role_id: 'sr9', is_active: true },
    { id: 'gsr5', group_id: 'g2', service_role_id: 'sr6', is_active: true },
    { id: 'gsr6', group_id: 'g3', service_role_id: 'sr10', is_active: true },
    { id: 'gsr7', group_id: 'g2', service_role_id: 'sr7', is_active: true },
    { id: 'gsr8', group_id: 'g5', service_role_id: 'sr4', is_active: true },
  ],
  eventTemplates: [
    { id: 't1', title: 'Gudstjeneste Standard', type: 'Gudstjeneste', recurrence_rule: 'Hver søndag kl. 11:00', color: '#2563eb' }, // Standard blå
  ],
  eventOccurrences: [],
  assignments: [
    { id: 'a1', template_id: 't1', service_role_id: 'sr1', person_id: null },
    { id: 'a2', template_id: 't1', service_role_id: 'sr2', person_id: null },
    { id: 'a3', template_id: 't1', service_role_id: 'sr5', person_id: null },
    { id: 'a4', template_id: 't1', service_role_id: 'sr9', person_id: null },
  ],
  programItems: [
    { id: 'pi0', template_id: 't1', title: 'Velkommen ved inngang', duration_minutes: 15, service_role_id: 'sr9', order: 0 },
    { id: 'pi1', template_id: 't1', title: 'Lovsang x2', duration_minutes: 7, group_id: 'g1', order: 1 },
    { id: 'pi2', template_id: 't1', title: 'Velkommen. Åpningsord', duration_minutes: 3, service_role_id: 'sr1', order: 2 },
    { id: 'pi3', template_id: 't1', title: 'Bønn', duration_minutes: 2, service_role_id: 'sr1', order: 3 },
    { id: 'pi9', template_id: 't1', title: 'Tale / undervisning', duration_minutes: 20, service_role_id: 'sr2', order: 6 },
  ],
  tasks: [], // Vil bli populert av generateYearlyWheelTasks()
  noticeMessages: [
    {
      id: 'm1',
      sender_id: 'p5',
      recipient_role: CoreRole.TEAM_LEADER,
      title: 'Husk lederforum mandag!',
      content: 'Vi gleder oss til å se alle gruppeledere til en samling på mandag kl 19:00. Vi skal snakke om visjonen for høsten.',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      isRead: false
    }
  ],
  changeLogs: [],
  families: [],
  familyMembers: []
};

type FamilySeed = {
  familieNavn: string;
  voksne: { navn: string; rolle: string; sivilstand: string; instruks: string }[];
  barn: { navn: string; alder: number; avdeling: string }[];
};

const getChildDepartment = (age: number) => {
  if (age <= 3) return 'Småbarn';
  if (age <= 6) return 'Barnekirke (Knøtt)';
  if (age <= 10) return 'Barnekirke (Skolebarn)';
  if (age <= 12) return 'Tweens';
  return 'Ungdom';
};

const generateFamilyData = (familyCount: number): FamilySeed[] => {
  const childCounts = Array.from({ length: familyCount }, (_, idx) => idx % 5); // 0-4, snitt 2
  for (let i = childCounts.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [childCounts[i], childCounts[j]] = [childCounts[j], childCounts[i]];
  }

  const usedFamilyNames = new Set<string>();
  const familyData: FamilySeed[] = [];

  for (let i = 0; i < familyCount; i += 1) {
    let familyName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    while (usedFamilyNames.has(familyName)) {
      familyName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    }
    usedFamilyNames.add(familyName);

    const adult1 = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const adult2 = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const voksne = [
      {
        navn: `${adult1} ${familyName}`,
        rolle: 'Forelder',
        sivilstand: `Gift med ${adult2}`,
        instruks: 'Ansvarlig i familien'
      },
      {
        navn: `${adult2} ${familyName}`,
        rolle: 'Forelder',
        sivilstand: `Gift med ${adult1}`,
        instruks: 'Ansvarlig i familien'
      }
    ];

    const barnCount = childCounts[i];
    const barn = Array.from({ length: barnCount }, () => {
      const childName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const age = Math.floor(Math.random() * 13) + 1; // 1-13
      return {
        navn: `${childName} ${familyName}`,
        alder: age,
        avdeling: getChildDepartment(age)
      };
    });

    familyData.push({
      familieNavn: familyName,
      voksne,
      barn
    });
  }

  return familyData;
};

// JSON-data for familier
const FAMILY_DATA = generateFamilyData(FAMILY_COUNT);

// Funksjon for å populere familiedata
function populateFamilyData(baseData: AppState): AppState {
  const newPersons: Person[] = [...baseData.persons];
  const newFamilies: Family[] = [...baseData.families];
  const newFamilyMembers: FamilyMember[] = [...baseData.familyMembers];
  const newServiceRoles: ServiceRole[] = [...baseData.serviceRoles];
  const newGroupServiceRoles: GroupServiceRole[] = [...baseData.groupServiceRoles];

  let personCounter = 100; // Start fra 100 for å unngå konflikter
  let familyCounter = 1;
  let familyMemberCounter = 1;

  FAMILY_DATA.forEach(familyData => {
    // Opprett familie
    const familyId = `f${familyCounter++}`;
    const family: Family = {
      id: familyId,
      name: `Familien ${familyData.familieNavn}`,
      created_at: new Date().toISOString()
    };
    newFamilies.push(family);

    // Opprett personer for voksne
    const adultPersons: Person[] = [];
    familyData.voksne.forEach(voksen => {
      let person: Person;
      const existingPersonIndex = newPersons.findIndex(p => p.name === voksen.navn);
      
      if (existingPersonIndex === -1) {
        // Opprett ny person
        const personId = `p${personCounter++}`;
        // Generer realistisk fødselsdato for voksne (1970-1995)
        const birthYear = Math.floor(Math.random() * 26) + 1970; // 1970-1995
        const address = generateAddress();
        person = {
          id: personId,
          name: voksen.navn,
          email: generateEmail(voksen.navn),
          phone: generatePhoneNumber(),
          birth_date: generateRandomBirthDate(birthYear),
          streetAddress: address.streetAddress,
          postalCode: address.postalCode,
          city: address.city,
          is_admin: false,
          is_active: true,
          core_role: CoreRole.MEMBER
        };
        newPersons.push(person);
      } else {
        // Bruk eksisterende person, men legg til manglende felter
        person = newPersons[existingPersonIndex];
        const updates: Partial<Person> = {};
        if (!person.birth_date) {
          const birthYear = Math.floor(Math.random() * 26) + 1970;
          updates.birth_date = generateRandomBirthDate(birthYear);
        }
        if (!person.streetAddress || !person.postalCode || !person.city) {
          const address = generateAddress();
          updates.streetAddress = address.streetAddress;
          updates.postalCode = address.postalCode;
          updates.city = address.city;
        }
        if (!person.phone) {
          updates.phone = generatePhoneNumber();
        }
        if (!person.email) {
          updates.email = generateEmail(person.name);
        }
        if (Object.keys(updates).length > 0) {
          person = { ...person, ...updates };
          newPersons[existingPersonIndex] = person;
        }
      }
      
      adultPersons.push(person);
    });

    // Opprett familiemedlemmer for voksne (som ektefeller/partnere)
    adultPersons.forEach((person, index) => {
      const familyMember: FamilyMember = {
        id: `fm${familyMemberCounter++}`,
        family_id: familyId,
        person_id: person.id,
        role: FamilyRole.PARTNER,
        isPrimaryResidence: true
      };
      newFamilyMembers.push(familyMember);
    });

    // Opprett personer for barn
    familyData.barn.forEach(barn => {
      let person: Person;
      const existingPersonIndex = newPersons.findIndex(p => p.name === barn.navn);
      
      if (existingPersonIndex === -1) {
        // Opprett ny person
        const personId = `p${personCounter++}`;
        // Generer fødselsdato basert på alder
        const birthDate = generateBirthDateFromAge(barn.alder);
        const address = generateAddress();
        
        person = {
          id: personId,
          name: barn.navn,
          birth_date: birthDate,
          email: generateEmail(barn.navn),
          phone: generatePhoneNumber(),
          streetAddress: address.streetAddress,
          postalCode: address.postalCode,
          city: address.city,
          is_admin: false,
          is_active: true,
          core_role: CoreRole.MEMBER
        };
        newPersons.push(person);
      } else {
        // Bruk eksisterende person, men oppdater manglende felter
        person = newPersons[existingPersonIndex];
        const updates: Partial<Person> = {};
        if (!person.birth_date) {
          updates.birth_date = generateBirthDateFromAge(barn.alder);
        }
        if (!person.streetAddress || !person.postalCode || !person.city) {
          const address = generateAddress();
          updates.streetAddress = address.streetAddress;
          updates.postalCode = address.postalCode;
          updates.city = address.city;
        }
        if (!person.phone) {
          updates.phone = generatePhoneNumber();
        }
        if (!person.email) {
          updates.email = generateEmail(person.name);
        }
        if (Object.keys(updates).length > 0) {
          person = { ...person, ...updates };
          newPersons[existingPersonIndex] = person;
        }
      }

      // Sjekk om familiemedlem allerede eksisterer
      const existingFamilyMember = newFamilyMembers.find(
        fm => fm.person_id === person.id && fm.family_id === familyId
      );

      if (!existingFamilyMember) {
        // Opprett familiemedlem for barnet
        const familyMember: FamilyMember = {
          id: `fm${familyMemberCounter++}`,
          family_id: familyId,
          person_id: person.id,
          role: FamilyRole.CHILD,
          isPrimaryResidence: true
        };
        newFamilyMembers.push(familyMember);
      }
    });
  });

  return {
    ...baseData,
    persons: newPersons,
    families: newFamilies,
    familyMembers: newFamilyMembers,
    serviceRoles: newServiceRoles,
    groupServiceRoles: newGroupServiceRoles
  };
}

// Helper function for deterministisk ID-generering basert på tittel og deadline
const generateTaskId = (title: string, deadline: string): string => {
  // Bruk en enkel hash-funksjon for å generere konsistente IDer
  const str = `${title}-${deadline}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Konverter til positivt tall og formater som UUID-lignende string
  const positiveHash = Math.abs(hash).toString(16).padStart(8, '0');
  return `task-${positiveHash}-${deadline.replace(/-/g, '')}`;
};

// Funksjon for å generere årshjul-tasks for et gitt år
const generateYearlyWheelTasks = (year: number): Task[] => {
  const tasks: Task[] = [];
  const adminId = INITIAL_DATA.persons.find(p => p.is_admin)?.id || INITIAL_DATA.persons[0]?.id || 'p1';
  
  // Helper function to create date string
  const dateStr = (month: number, day: number) => {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${monthStr}-${dayStr}`;
  };
  
  // Januar (month 0)
  tasks.push(
    { id: generateTaskId('Rapportere trossamfunnsstatistikk', dateStr(0, 15)), title: 'Rapportere trossamfunnsstatistikk', deadline: dateStr(0, 15), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null },
    { id: generateTaskId('Rapportere skattemelding, AGA og skatt', dateStr(0, 31)), title: 'Rapportere skattemelding, AGA og skatt', deadline: dateStr(0, 31), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null },
    { id: generateTaskId('Regnskap og planlegging av årsbudsjett', dateStr(0, 31)), title: 'Regnskap og planlegging av årsbudsjett', deadline: dateStr(0, 31), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null }
  );
  
  // Februar (month 1)
  tasks.push(
    { id: generateTaskId('Sende ut innkallelse til årsmøte', dateStr(1, 15)), title: 'Sende ut innkallelse til årsmøte', deadline: dateStr(1, 15), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null },
    { id: generateTaskId('Nominasjon av kandidater til valg', dateStr(1, 28)), title: 'Nominasjon av kandidater til valg', deadline: dateStr(1, 28), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null },
    { id: generateTaskId('Regnskapsrapportering til lederskapet', dateStr(1, 28)), title: 'Regnskapsrapportering til lederskapet', deadline: dateStr(1, 28), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null }
  );
  
  // Mars (month 2)
  tasks.push(
    { id: generateTaskId('ÅRSMØTE', dateStr(2, 31)), title: 'ÅRSMØTE', deadline: dateStr(2, 31), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null },
    { id: generateTaskId('PMF (uke 11)', dateStr(2, 20)), title: 'PMF (uke 11)', deadline: dateStr(2, 20), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null },
    { id: generateTaskId('Rapportere menighetsstatistikk', dateStr(2, 1)), title: 'Rapportere menighetsstatistikk', deadline: dateStr(2, 1), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null },
    { id: generateTaskId('Månedsregnskap', dateStr(2, 31)), title: 'Månedsregnskap', deadline: dateStr(2, 31), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null }
  );
  
  // April (month 3)
  tasks.push(
    { id: generateTaskId('Menighetsweekend', dateStr(3, 30)), title: 'Menighetsweekend', deadline: dateStr(3, 30), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null },
    { id: generateTaskId('Ferdigstille kalender for høsthalvåret (Gudstjenester/medlemsmøter)', dateStr(3, 30)), title: 'Ferdigstille kalender for høsthalvåret (Gudstjenester/medlemsmøter)', deadline: dateStr(3, 30), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null },
    { id: generateTaskId('Melde arrangementer til utleier', dateStr(3, 30)), title: 'Melde arrangementer til utleier', deadline: dateStr(3, 30), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null },
    { id: generateTaskId('Rapportering av årsregnskap til MKNU (Altinn)', dateStr(3, 30)), title: 'Rapportering av årsregnskap til MKNU (Altinn)', deadline: dateStr(3, 30), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null }
  );
  
  // Mai (month 4)
  tasks.push(
    { id: generateTaskId('Månedsregnskap og vanlig drift', dateStr(4, 31)), title: 'Månedsregnskap og vanlig drift', deadline: dateStr(4, 31), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null }
  );
  
  // Juni (month 5)
  tasks.push(
    { id: generateTaskId('Utegudstjeneste (Søknadsfrist 15. mai for Bananparken eller andre steder)', dateStr(5, 15)), title: 'Utegudstjeneste (Søknadsfrist 15. mai for Bananparken eller andre steder)', deadline: dateStr(5, 15), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null },
    { id: generateTaskId('Gudstjenesteliste for høsthalvåret (skal være klar før siste gudstjeneste i juni)', dateStr(5, 30)), title: 'Gudstjenesteliste for høsthalvåret (skal være klar før siste gudstjeneste i juni)', deadline: dateStr(5, 30), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null },
    { id: generateTaskId('Månedsregnskap', dateStr(5, 30)), title: 'Månedsregnskap', deadline: dateStr(5, 30), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null }
  );
  
  // Juli (month 6)
  tasks.push(
    { id: generateTaskId('MVA-rapportering til Misjonskirken Norge', dateStr(6, 31)), title: 'MVA-rapportering til Misjonskirken Norge', deadline: dateStr(6, 31), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null }
  );
  
  // August (month 7)
  tasks.push(
    { id: generateTaskId('Nedsette komité for menighetsweekend', dateStr(7, 15)), title: 'Nedsette komité for menighetsweekend', deadline: dateStr(7, 15), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null },
    { id: generateTaskId('Fastsette datoer for lederskapet', dateStr(7, 31)), title: 'Fastsette datoer for lederskapet', deadline: dateStr(7, 31), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null },
    { id: generateTaskId('Gudstjenesteledermøte', dateStr(7, 31)), title: 'Gudstjenesteledermøte', deadline: dateStr(7, 31), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null },
    { id: generateTaskId('Kartlegging av frivillige til oppgaver og gudstjenester', dateStr(7, 31)), title: 'Kartlegging av frivillige til oppgaver og gudstjenester', deadline: dateStr(7, 31), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null },
    { id: generateTaskId('Sjekke politiattester', dateStr(7, 31)), title: 'Sjekke politiattester', deadline: dateStr(7, 31), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null }
  );
  
  // September (month 8)
  tasks.push(
    { id: generateTaskId('Ferdigstille kalender for vårhalvåret (Gudstjenester/medlemsmøter)', dateStr(8, 30)), title: 'Ferdigstille kalender for vårhalvåret (Gudstjenester/medlemsmøter)', deadline: dateStr(8, 30), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null },
    { id: generateTaskId('Melde arrangementer til utleier', dateStr(8, 30)), title: 'Melde arrangementer til utleier', deadline: dateStr(8, 30), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null },
    { id: generateTaskId('Månedsregnskap', dateStr(8, 30)), title: 'Månedsregnskap', deadline: dateStr(8, 30), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null }
  );
  
  // Oktober (month 9)
  tasks.push(
    { id: generateTaskId('Menighetsmøte', dateStr(9, 31)), title: 'Menighetsmøte', deadline: dateStr(9, 31), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null },
    { id: generateTaskId('Kampanje for faste givere', dateStr(9, 31)), title: 'Kampanje for faste givere', deadline: dateStr(9, 31), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null },
    { id: generateTaskId('Planleggingsstart for adventsamling', dateStr(9, 31)), title: 'Planleggingsstart for adventsamling', deadline: dateStr(9, 31), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null }
  );
  
  // November (month 10)
  tasks.push(
    { id: generateTaskId('Budsjettarbeid for kommende år', dateStr(10, 30)), title: 'Budsjettarbeid for kommende år', deadline: dateStr(10, 30), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null },
    { id: generateTaskId('Planlegging av menighetsweekend', dateStr(10, 30)), title: 'Planlegging av menighetsweekend', deadline: dateStr(10, 30), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null }
  );
  
  // Desember (month 11)
  tasks.push(
    { id: generateTaskId('Gudstjenesteliste for vårhalvåret (skal være klar før siste gudstjeneste i desember)', dateStr(11, 20)), title: 'Gudstjenesteliste for vårhalvåret (skal være klar før siste gudstjeneste i desember)', deadline: dateStr(11, 20), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null },
    { id: generateTaskId('Adventsamling', dateStr(11, 24)), title: 'Adventsamling', deadline: dateStr(11, 24), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null },
    { id: generateTaskId('Planlegging av neste års årsmøte', dateStr(11, 31)), title: 'Planlegging av neste års årsmøte', deadline: dateStr(11, 31), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null },
    { id: generateTaskId('Rapportering til Misjonskirken Norge', dateStr(11, 31)), title: 'Rapportering til Misjonskirken Norge', deadline: dateStr(11, 31), responsible_id: adminId, is_global: true, occurrence_id: null, template_id: null }
  );
  
  return tasks;
};

// Populer INITIAL_DATA med familiedata
const populatedWithFamilies = populateFamilyData(INITIAL_DATA);

// Legg til årshjul-tasks for inneværende år
const currentYear = new Date().getFullYear();
export const POPULATED_DATA: AppState = {
  ...populatedWithFamilies,
  tasks: [...populatedWithFamilies.tasks, ...generateYearlyWheelTasks(currentYear)]
};

// Eksporter funksjon for backup av personer og grupper
export const exportPersonsAndGroups = () => {
  return {
    persons: POPULATED_DATA.persons,
    groups: POPULATED_DATA.groups,
    exportDate: new Date().toISOString(),
    version: '0.4'
  };
};
