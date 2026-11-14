// "What people mention" chips, with no AI service: tokenise, drop stopwords, count in how many
// DIFFERENT reviews each word or word pair appears (document frequency), keep the common ones.
// Document frequency (not raw count) so one enthusiastic review saying "soft soft soft" cannot
// make "soft" a topic by itself.

export const MIN_REVIEWS_PER_TOPIC = 3;
export const MAX_TOPICS = 8;

const STOPWORDS = new Set(
  `a about above after again all also am an and any are as at be because been before being below
  between both but by can could did do does doing down during each few for from further had has have
  having he her here hers him his how i if in into is it its itself just me more most my myself no
  nor not now of off on once only or other our ours out over own same she should so some such than
  that the their theirs them then there these they this those through to too under until up us very
  was we were what when where which while who whom why will with would you your yours yourself
  dont didnt doesnt isnt wasnt cant couldnt wont wouldnt ive im youre theyre thats its got get gets
  bought buy buying one really quite bit lot much many even still ever always never will
  product item order ordered arrived item items thing things
  enough every well like looks look looked made took picked since time times day days week weeks
  second first little needs exactly quickly already around away back again great good nice perfect
  lovely brilliant fine pet pets nothing better everything friend friends actually`
    .split(/\s+/)
    .filter(Boolean),
);

// Words that carry the meaning of a topic have at least 3 letters ("tv" would be noise here).
const isContentWord = (w: string) => w.length >= 3 && !STOPWORDS.has(w);

// Lowercase and split into "phrases" at punctuation, so a pair never spans two sentences
// ("loved it. Bed is soft" must not produce "it bed"). Apostrophes are dropped inside words.
function phrases(text: string): string[][] {
  return text
    .toLowerCase()
    .replace(/['’]/g, '')
    .split(/[^\p{L}\p{N}\s]+/u)
    .map((chunk) => chunk.split(/\s+/).filter(Boolean));
}

export function topicsOfText(text: string): Set<string> {
  const found = new Set<string>();
  for (const words of phrases(text)) {
    // A pair is two ADJACENT words, both meaningful: "memory foam" yes, "bed and" no.
    for (let i = 0; i < words.length; i++) {
      const w = words[i]!;
      if (!isContentWord(w)) continue;
      found.add(w);
      const next = words[i + 1];
      if (next !== undefined && isContentWord(next)) found.add(`${w} ${next}`);
    }
  }
  return found;
}

export interface Topic {
  topic: string;
  count: number;
}

export function extractTopics(texts: string[]): Topic[] {
  const df = new Map<string, number>();
  for (const text of texts) {
    for (const t of topicsOfText(text)) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const kept = [...df]
    .filter(([, count]) => count >= MIN_REVIEWS_PER_TOPIC)
    .map(([topic, count]) => ({ topic, count }));

  // "memory" and "memory foam" with the same count say the same thing: keep the pair, drop the
  // word it swallowed. A word that also appears elsewhere (higher count) stays.
  const pairs = kept.filter((t) => t.topic.includes(' '));
  const redundant = (t: Topic) =>
    !t.topic.includes(' ') &&
    pairs.some((p) => p.count === t.count && p.topic.split(' ').includes(t.topic));

  return kept
    .filter((t) => !redundant(t))
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic))
    .slice(0, MAX_TOPICS);
}
