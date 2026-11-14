import type { Tx } from '../client.ts';
import { charities } from '../schema/index.ts';

// A made-up shelter (portfolio store): payments run in Stripe test mode, which the footer states.
export const charitySeed = {
  slug: 'whisker-hollow-rescue',
  name: 'Whisker Hollow Rescue',
  description:
    'A small, volunteer-run shelter in a quiet valley that finds homes for stray cats, dogs and the occasional rabbit. Your round-ups and points help cover food, bedding and vet visits while each animal waits for the right family.',
};

// Upsert on the slug so a re-seed refreshes the wording without duplicating the shelter.
export async function seedCharity(tx: Tx): Promise<void> {
  await tx
    .insert(charities)
    .values(charitySeed)
    .onConflictDoUpdate({
      target: charities.slug,
      set: { name: charitySeed.name, description: charitySeed.description },
    });
}
