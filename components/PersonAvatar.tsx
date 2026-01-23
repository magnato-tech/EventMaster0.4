
import React from 'react';
import { Person } from '../types';

interface PersonAvatarProps {
  person: Person;
  size?: number;
  className?: string;
}

const generateAvatarUrl = (person: Person): string => {
  if (person.imageUrl) {
    return person.imageUrl;
  }

  const seed = person.name || person.id;
  const baseUrl = 'https://api.dicebear.com/7.x/avataaars/svg';
  const params = new URLSearchParams({
    seed,
    mouth: 'smile',
    eyes: 'happy',
    eyebrows: 'default',
    skinColor: 'light',
    clothing: 'shirtVNeck',
    clothingColor: 'blue01'
  });

  return `${baseUrl}?${params.toString()}`;
};

const PersonAvatar: React.FC<PersonAvatarProps> = ({ person, size = 40, className = '' }) => {
  const avatarUrl = generateAvatarUrl(person);
  const displayName = person.name;

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


