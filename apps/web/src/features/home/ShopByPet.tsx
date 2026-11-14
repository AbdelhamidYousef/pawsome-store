import { useState } from 'react';
import { Link } from 'react-router-dom';

import { PetGlyph } from '../../components/icons';
import { useT, type StringKey } from '../../i18n';
import { PETS, type Pet } from '../../lib/pets';
import { useCategories } from '../catalog/queries';

// "Who are you shopping for?": one round portrait per pet, ringed in the pet's colour. Names,
// links and colours come from the typed PETS constant so the row paints at once; the product
// counts are the only API data and fill in when the request lands.
const PET_NAMES: Record<Pet['slug'], StringKey> = {
  dogs: 'catalog.petTile.dogs',
  cats: 'catalog.petTile.cats',
  birds: 'catalog.petTile.birds',
  fish: 'catalog.petTile.fish',
  'small-pets': 'catalog.petTile.smallPets',
  reptiles: 'catalog.petTile.reptiles',
};

// The portrait files in /public/pets (square, the animal on a flat backdrop).
const PHOTO: Record<Pet['slug'], string> = {
  dogs: '/pets/dog.webp',
  cats: '/pets/cat.webp',
  birds: '/pets/bird.webp',
  fish: '/pets/fish.webp',
  'small-pets': '/pets/small-pets.webp',
  reptiles: '/pets/reptiles.webp',
};

// The photo, or (missing or failed to load) the pet's glyph on its accent colour.
function PetPortrait({ pet }: { pet: Pet }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="relative block aspect-square w-full max-w-[10rem] overflow-hidden rounded-full border-[5px] border-pet-accent bg-pet-soft shadow-card transition-transform duration-300 ease-out group-hover:-translate-y-1 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
      {failed ? (
        <span className="flex h-full w-full items-center justify-center bg-pet-accent text-ink">
          <PetGlyph icon={pet.icon} width={56} height={56} />
        </span>
      ) : (
        <img
          src={PHOTO[pet.slug]}
          alt=""
          width={480}
          height={480}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      )}
    </span>
  );
}

export function ShopByPet() {
  const { t, tn } = useT();
  const { data: categories } = useCategories();
  const counts = new Map(categories?.map((c) => [c.slug, c.productCount]));

  return (
    <section aria-labelledby="home-pets-heading">
      <h2
        id="home-pets-heading"
        className="mb-8 text-[1.75rem] font-bold leading-tight sm:text-4xl lg:mb-10"
      >
        {t('shell.home.whoFor')}
      </h2>
      <ul
        className="grid grid-cols-3 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-6"
        data-testid="pet-tiles"
      >
        {PETS.map((pet) => {
          const count = counts.get(pet.slug);
          return (
            <li key={pet.slug} data-pet={pet.accent} className="min-w-0">
              <Link
                to={`/c/${pet.slug}`}
                className="group flex flex-col items-center gap-3 rounded-card text-center"
              >
                <PetPortrait pet={pet} />
                <span className="flex flex-col">
                  <span className="font-display text-lg font-semibold leading-tight text-ink group-hover:underline sm:text-xl">
                    {t(PET_NAMES[pet.slug])}
                  </span>
                  <span className="min-h-5 text-sm text-muted">
                    {count === undefined ? '' : tn('catalog.productCount', count)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
