
import React from 'react';
import { Person } from '../types';

interface PersonAvatarProps {
  person: Person;
  size?: number;
  className?: string;
}

/**
 * Genererer en DiceBear Avataaars URL basert på personens egenskaper
 */
const generateAvatarUrl = (person: Person): string => {
  // Hvis personen har en egen bilde-URL, bruk den
  if (person.imageUrl) {
    return person.imageUrl;
  }

  // Bruk personens ID som seed for konsistent generering
  const seed = person.id;
  
  // Bestem kjønn-basert styling
  const isMale = person.gender === 'Mann';
  const isChild = person.age !== undefined && person.age < 12;
  const isElderly = person.age !== undefined && person.age > 60;
  
  // Bygg URL med parametere
  const baseUrl = 'https://api.dicebear.com/7.x/avataaars/svg';
  const params = new URLSearchParams({
    seed: seed,
    // Kjønn-basert styling
    ...(isMale ? {
      top: 'shortHairShortFlat', // Kort hår for menn
      facialHair: 'none',
    } : {
      top: 'longHairStraight', // Langt hår for kvinner
    }),
    // Barne-trekk
    ...(isChild ? {
      top: isMale ? 'shortHairShortRound' : 'longHairBob', // Yngre hårstiler
      accessories: 'round', // Runde briller for barn
    } : {}),
    // Eldre trekk
    ...(isElderly ? {
      top: isMale ? 'shortHairShortFlat' : 'longHairStraightStrand', // Grått hår
      hairColor: 'gray', // Grått hår
    } : {}),
    // Smilende/vennlig uttrykk
    mouth: 'smile', // Smil
    eyes: 'happy', // Glade øyne
    eyebrows: 'default', // Standard øyenbryn
    skinColor: 'light', // Lys hudtone
    // Klær
    clothing: 'shirtVNeck', // V-hals skjorte
    clothingColor: 'blue01', // Blå farge
  });

  return `${baseUrl}?${params.toString()}`;
};

const PersonAvatar: React.FC<PersonAvatarProps> = ({ person, size = 40, className = '' }) => {
  const avatarUrl = generateAvatarUrl(person);
  const displayName = `${person.firstName} ${person.lastName}`;

  return (
    <img
      src={avatarUrl}
      alt={displayName}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      style={{ minWidth: size, minHeight: size }}
    />
  );
};

export default PersonAvatar;


