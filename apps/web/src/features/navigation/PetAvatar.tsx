import { useState } from 'react';

import { PetGlyph } from '../../components/icons';
import type { Pet } from '../../lib/pets';

// The portrait files in /public/pets: file name by pet slug.
const PHOTO: Record<Pet['slug'], string> = {
  dogs: '/pets/dog.webp',
  cats: '/pets/cat.webp',
  birds: '/pets/bird.webp',
  fish: '/pets/fish.webp',
  'small-pets': '/pets/small-pets.webp',
  reptiles: '/pets/reptiles.webp',
};

// A 28 px round avatar for the main nav: the pet portrait ringed in the pet's colour (the parent
// carries `data-pet`). If the photo is missing or fails, the glyph bubble it replaced stands in.
export function PetAvatar({ pet }: { pet: Pet }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pet-accent text-ink">
        <PetGlyph icon={pet.icon} width={18} height={18} />
      </span>
    );
  }
  return (
    <img
      src={PHOTO[pet.slug]}
      alt=""
      width={28}
      height={28}
      decoding="async"
      onError={() => setFailed(true)}
      className="h-7 w-7 rounded-full border-2 border-pet-accent bg-pet-soft object-cover"
    />
  );
}
