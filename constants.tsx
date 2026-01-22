
import { AppState, GroupCategory, GroupRole, CoreRole, Person, Family, FamilyMember, FamilyRole, ServiceRole, GroupMember, GroupServiceRole, UUID, Task } from './types';

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

// Funksjon for å generere 45 personer med riktig geografisk fordeling
const generate45Persons = (): Person[] => {
  const persons: Person[] = [];
  let personCounter = 1;
  const usedNames = new Set<string>();
  
  // Geografisk fordeling: 70% Lillesand (32), 10% hver av de andre (4-5 hver)
  const distribution = [
    ...Array(32).fill(LOCATIONS.lillesand),  // 32 personer i Lillesand
    ...Array(5).fill(LOCATIONS.hovag),       // 5 personer i Høvåg
    ...Array(4).fill(LOCATIONS.birkeland),   // 4 personer i Birkeland
    ...Array(4).fill(LOCATIONS.grimstad)    // 4 personer i Grimstad
  ];
  
  // Blande distribusjonen for tilfeldig rekkefølge
  for (let i = distribution.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [distribution[i], distribution[j]] = [distribution[j], distribution[i]];
  }
  
  // Generer personer
  distribution.forEach((location, index) => {
    const personId = `p${personCounter++}`;
    
    // Velg unikt navn (unngå duplikater)
    let name: string;
    let attempts = 0;
    do {
      const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      name = `${firstName} ${lastName}`;
      attempts++;
    } while (usedNames.has(name) && attempts < 100);
    usedNames.add(name);
    
    // Generer fødselsdato (blanding av voksne og barn)
    let birthYear: number;
    if (index < 10) {
      // 10 barn (2008-2025)
      birthYear = Math.floor(Math.random() * 18) + 2008; // 2008-2025
    } else if (index < 25) {
      // 15 voksne (1970-1995)
      birthYear = Math.floor(Math.random() * 26) + 1970;
    } else {
      // 20 voksne (1980-2000)
      birthYear = Math.floor(Math.random() * 21) + 1980;
    }
    
    const address = generateAddressForLocation(location);
    
    persons.push({
      id: personId,
      name,
      email: generateEmail(name),
      phone: generatePhoneNumber(),
      birth_date: generateRandomBirthDate(birthYear),
      streetAddress: address.streetAddress,
      postalCode: address.postalCode,
      city: address.city,
      is_admin: index === 0, // Første person er admin
      is_active: true,
      core_role: index === 0 ? CoreRole.ADMIN : (index < 5 ? CoreRole.TEAM_LEADER : CoreRole.MEMBER)
    });
  });
  
  return persons;
};

// Forhåndsdefinert medlemsliste
const generatedPersons: Person[] = [
  {
    id: 'p1',
    name: 'Anders Admin',
    streetAddress: 'Lillesandsveien 1',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1980-01-01',
    is_admin: true,
    is_active: true,
    core_role: CoreRole.ADMIN
  },
  {
    id: 'p2',
    name: 'Anders Haugen',
    streetAddress: 'Storgata 5',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1985-05-12',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p3',
    name: 'Anders Sørensen',
    streetAddress: 'Havnegata 10',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1978-08-23',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p4',
    name: 'Anne Strand',
    streetAddress: 'Strandveien 2',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1992-03-15',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p5',
    name: 'Anne Sørensen',
    streetAddress: 'Kirkegata 4',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1988-11-30',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p6',
    name: 'Arne Larsen',
    streetAddress: 'Skoleveien 8',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1975-07-05',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p7',
    name: 'Arne Nilsen',
    streetAddress: 'Parkveien 3',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1982-09-18',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p8',
    name: 'Beate Barneki',
    streetAddress: 'Barkeveien 12',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1995-02-22',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p9',
    name: 'Benny Barneki',
    streetAddress: 'Barkeveien 14',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1990-10-10',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p10',
    name: 'Bjarne Bilde',
    streetAddress: 'Museumsveien 6',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1968-04-04',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p11',
    name: 'Bjørn Dahl',
    streetAddress: 'Skogveien 7',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1973-12-19',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p12',
    name: 'Bjørn Kristiansen',
    streetAddress: 'Fjordveien 9',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1981-06-27',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p13',
    name: 'Erik Haugen',
    streetAddress: 'Øvre gate 11',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1984-01-08',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p14',
    name: 'Frida Forbønn',
    streetAddress: 'Kirkeveien 15',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1998-02-14',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p15',
    name: 'Geir Eriksen',
    streetAddress: 'Nedre gate 13',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1970-05-03',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p16',
    name: 'Geir Moe',
    streetAddress: 'Bakkeveien 17',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1976-09-21',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p17',
    name: 'Hanne Andersen',
    streetAddress: 'Solveien 20',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1989-08-09',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p18',
    name: 'Hanne Haugland',
    streetAddress: 'Lia 5',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1993-04-25',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p19',
    name: 'Henriette',
    streetAddress: 'Sentrumsgata 1',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '2000-12-12',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p20',
    name: 'Henrik Nilsen',
    streetAddress: 'Torvet 3',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1987-06-06',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p21',
    name: 'Jan Kristiansen',
    streetAddress: 'Bruveien 2',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1979-03-17',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p22',
    name: 'Kari Berg',
    streetAddress: 'Klippeveien 4',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1983-02-28',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p23',
    name: 'Kari Sandvik',
    streetAddress: 'Sandveien 8',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1991-11-11',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p24',
    name: 'Karl Furubakk',
    streetAddress: 'Furustien 10',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1986-07-02',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p25',
    name: 'Kristin Larsen',
    streetAddress: 'Myra 6',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1994-05-24',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p26',
    name: 'Lars Lyd',
    streetAddress: 'Musikkveien 1',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1972-09-13',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p27',
    name: 'Lars Moe',
    streetAddress: 'Engveien 5',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1980-10-07',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p28',
    name: 'Lille-Lise Jr.',
    streetAddress: 'Småveien 3',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '2015-05-20',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p29',
    name: 'Lise Johansen',
    streetAddress: 'Nordveien 12',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1988-01-16',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p30',
    name: 'Lise Lovsang',
    streetAddress: 'Korveien 7',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1992-12-04',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p31',
    name: 'Lise Sørensen',
    streetAddress: 'Sørveien 9',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1985-08-22',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p32',
    name: 'Lukas Lovsang',
    streetAddress: 'Korveien 9',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1995-05-05',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p33',
    name: 'Magnus Jensen',
    streetAddress: 'Vestveien 14',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1983-06-18',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p34',
    name: 'Magnus Kristian',
    streetAddress: 'Østveien 11',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1981-03-29',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p35',
    name: 'Marit Strand',
    streetAddress: 'Strandpromenaden 4',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1977-11-03',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p36',
    name: 'Marit Vik',
    streetAddress: 'Vika 2',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1984-07-14',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p37',
    name: 'Marius Møteveit',
    streetAddress: 'Møteveien 1',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1990-09-26',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p38',
    name: 'Marte Johansen',
    streetAddress: 'Elveveien 8',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1996-02-10',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p39',
    name: 'Marte Lunde',
    streetAddress: 'Lundveien 13',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1989-08-31',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p40',
    name: 'Martin Bakke',
    streetAddress: 'Bakken 4',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1982-04-19',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p41',
    name: 'Mats Knutsen',
    streetAddress: 'Toppen 6',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1987-12-07',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p42',
    name: 'Mats Møteveit',
    streetAddress: 'Møteveien 3',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1993-01-12',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p43',
    name: 'Mette Fredriks',
    streetAddress: 'Dalveien 15',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1979-10-28',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p44',
    name: 'Mille Møteveit',
    streetAddress: 'Møteveien 5',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1998-05-15',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p45',
    name: 'Morten Møteveit',
    streetAddress: 'Møteveien 7',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1991-06-01',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p46',
    name: 'Nina Sørensen',
    streetAddress: 'Åsen 2',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1986-03-23',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p47',
    name: 'Ole Holm',
    streetAddress: 'Holmen 1',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1974-09-04',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p48',
    name: 'Ole Lie',
    streetAddress: 'Lien 3',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1980-11-17',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p49',
    name: 'Ole Myklebust',
    streetAddress: 'Myra 10',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1983-12-29',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p50',
    name: 'Ole Solberg',
    streetAddress: 'Berget 5',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1978-08-08',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p51',
    name: 'Per Pastor',
    streetAddress: 'Kirkegata 12',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1965-05-14',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.PASTOR
  },
  {
    id: 'p52',
    name: 'Silje Lie',
    streetAddress: 'Lien 5',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1992-02-20',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p53',
    name: 'Silje Olsen',
    streetAddress: 'Blomsterveien 4',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1989-07-11',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p54',
    name: 'Siri Haugland',
    streetAddress: 'Utsikten 2',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1994-01-05',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p55',
    name: 'Teodor Taler',
    streetAddress: 'Talveien 1',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1988-06-30',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p56',
    name: 'Thea Taler',
    streetAddress: 'Talveien 3',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1995-10-12',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p57',
    name: 'Thomas Taler',
    streetAddress: 'Talveien 5',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1991-03-18',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p58',
    name: 'Tiril Taler',
    streetAddress: 'Talveien 7',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '2002-07-25',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p59',
    name: 'Tobias Taler',
    streetAddress: 'Talveien 9',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1999-09-09',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p60',
    name: 'Tom Tekniker',
    streetAddress: 'Verkstedveien 2',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1976-04-16',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p61',
    name: 'Tone Holm',
    streetAddress: 'Holmen 3',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1982-11-21',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p62',
    name: 'Truls Malm',
    streetAddress: 'Malmveien 6',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1985-02-03',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p63',
    name: 'Vigdis Vertska',
    streetAddress: 'Gjestestua 1',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1971-12-14',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p64',
    name: 'Vilde Holm',
    streetAddress: 'Holmen 5',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1997-08-27',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p65',
    name: 'Vilde Olsen',
    streetAddress: 'Blomsterveien 6',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1993-05-08',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  },
  {
    id: 'p66',
    name: 'Vilde Aas',
    streetAddress: 'Åsen 4',
    postalCode: '4790',
    city: 'Lillesand',
    birth_date: '1990-01-19',
    is_admin: false,
    is_active: true,
    core_role: CoreRole.MEMBER
  }
];

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

// JSON-data for familier
const FAMILY_DATA = [
  {
    "familieNavn": "Lovsang",
    "voksne": [
      { "navn": "Lise Lovsang", "rolle": "Lovsang", "sivilstand": "Gift med Lars", "instruks": "Leder lovsangsteamet" },
      { "navn": "Lars Lyd", "rolle": "Lyd", "sivilstand": "Gift med Lise", "instruks": "Ansvarlig for FOH og lydsjekk" }
    ],
    "barn": [
      { "navn": "Lille-Lise Jr.", "alder": 5, "avdeling": "Barnekirke (Småbarn)" },
      { "navn": "Lukas Lovsang", "alder": 8, "avdeling": "Barnekirke (Skolebarn)" }
    ]
  },
  {
    "familieNavn": "Møtevert",
    "voksne": [
      { "navn": "Morten Møtevert", "rolle": "Møteleder", "sivilstand": "Gift med Vigdis", "instruks": "Sy sammen gudstjenesten" },
      { "navn": "Vigdis Vertskap", "rolle": "Møtevert", "sivilstand": "Gift med Morten", "instruks": "Velkomst og nattverd" }
    ],
    "barn": [
      { "navn": "Marius Møtevert", "alder": 12, "avdeling": "Tweens" },
      { "navn": "Mille Møtevert", "alder": 3, "avdeling": "Barnekirke (Knøtt)" },
      { "navn": "Mats Møtevert", "alder": 6, "avdeling": "Barnekirke (Skolebarn)" }
    ]
  },
  {
    "familieNavn": "Barnekirke/Bilde",
    "voksne": [
      { "navn": "Beate Barnekirke", "rolle": "Barnekirke", "sivilstand": "Gift med Bjarne", "instruks": "Ansvarlig for barnas samling" },
      { "navn": "Bjarne Bilde", "rolle": "Bilde", "sivilstand": "Gift med Beate", "instruks": "Styring av tekst og skjerm" }
    ],
    "barn": [
      { "navn": "Benny Barnekirke", "alder": 10, "avdeling": "Barnekirke (Skolebarn)" }
    ]
  },
  {
    "familieNavn": "Taler/Forbønn",
    "voksne": [
      { "navn": "Thomas Taler", "rolle": "Taler", "sivilstand": "Gift med Frida", "instruks": "Dagens undervisning" },
      { "navn": "Frida Forbønn", "rolle": "Forbønn", "sivilstand": "Gift med Thomas", "instruks": "Bistå ved bønnestasjoner" }
    ],
    "barn": [
      { "navn": "Thea Taler", "alder": 7, "avdeling": "Barnekirke (Skolebarn)" },
      { "navn": "Tobias Taler", "alder": 4, "avdeling": "Barnekirke (Knøtt)" },
      { "navn": "Tiril Taler", "alder": 2, "avdeling": "Småbarn" },
      { "navn": "Teodor Taler", "alder": 9, "avdeling": "Barnekirke (Skolebarn)" }
    ]
  }
];

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
