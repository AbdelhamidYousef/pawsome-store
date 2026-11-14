import type { HelpHit, HelpTopic } from '@store/shared';

import { translateHelp } from '../i18n/content-translations.ts';

import * as repo from './repo.ts';

// The contract phase 24's agent tool calls unchanged: pure of HTTP (no request, no response), so
// a router, a script and an agent tool can all use it. Empty or missing `q` lists by topic.
// Matching runs on the English text (the search index is English); the answer comes back in the
// request's language, and a translated answer drops the English highlight snippet.
export async function searchHelp(q?: string, topic?: HelpTopic): Promise<HelpHit[]> {
  const term = q?.trim();
  const found = term ? await repo.search(term, topic) : await repo.listByTopic(topic);
  const { rows, translated } = await translateHelp(found);
  return rows.map(({ id, snippet, ...hit }) => ({
    ...hit,
    snippet: translated.has(id) ? null : snippet,
  }));
}
