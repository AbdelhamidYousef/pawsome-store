import { HIGHLIGHT_END, HIGHLIGHT_START, type HelpTopic } from '@store/shared';
import { and, asc, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';

import { db } from '../../db/client.ts';
import { helpArticles } from '../../db/schema/index.ts';

export interface HelpRow {
  id: string;
  slug: string;
  topic: HelpTopic;
  question: string;
  answerMd: string;
  snippet: string | null;
}

const MAX_HITS = 30;

// `websearch_to_tsquery` never raises a syntax error: quotes, dashes, `&`, `:*` and stray
// punctuation are all treated as plain text, so any string a visitor types is safe to pass. The
// text is still always a bound parameter, never concatenated into SQL.
const tsQuery = (q: string) => sql`websearch_to_tsquery('english', ${q})`;

// `%` and `_` are LIKE wildcards; a visitor typing "50%" means the characters.
const likeEscape = (q: string) => q.replace(/[\\%_]/g, '\\$&');

const columns = {
  id: helpArticles.id,
  slug: helpArticles.slug,
  topic: helpArticles.topic,
  question: helpArticles.question,
  answerMd: helpArticles.answerMd,
};

const published = eq(helpArticles.status, 'published');

// No query: the editors' order inside the chosen topic (or every topic).
export async function listByTopic(topic?: HelpTopic): Promise<HelpRow[]> {
  const rows = await db
    .select(columns)
    .from(helpArticles)
    .where(and(published, topic ? eq(helpArticles.topic, topic) : undefined))
    .orderBy(asc(helpArticles.topic), asc(helpArticles.sortOrder), asc(helpArticles.id));
  return rows.map((r) => ({ ...r, snippet: null }));
}

export async function search(q: string, topic?: HelpTopic): Promise<HelpRow[]> {
  const topicCondition: SQL | undefined = topic ? eq(helpArticles.topic, topic) : undefined;
  const query = tsQuery(q);
  // A query made only of stop words ("the", "a") compiles to an empty tsquery that matches
  // nothing; that case falls back to a substring match instead of a confusing "no results".
  const [probe] = await db.execute<{ n: number }>(sql`select numnode(${query}) as n`);
  if ((probe?.n ?? 0) === 0) {
    const like = `%${likeEscape(q)}%`;
    const rows = await db
      .select(columns)
      .from(helpArticles)
      .where(
        and(
          published,
          topicCondition,
          or(ilike(helpArticles.question, like), ilike(helpArticles.answerMd, like)),
        ),
      )
      .orderBy(asc(helpArticles.sortOrder), asc(helpArticles.id))
      .limit(MAX_HITS);
    return rows.map((r) => ({ ...r, snippet: null }));
  }

  // ts_headline works on the text, not the tsvector, and is slow, so it only runs for the rows
  // that matched (at most MAX_HITS). Markdown punctuation is stripped first so the snippet reads
  // as a sentence. The question is weighted A and the answer B in the generated column, so a
  // question match outranks an answer match without any extra code here.
  const options = `StartSel=${HIGHLIGHT_START},StopSel=${HIGHLIGHT_END},MaxWords=24,MinWords=8,ShortWord=2`;
  const snippet = sql<string>`ts_headline('english', regexp_replace(${helpArticles.answerMd}, '[*_#>\`\\[\\]]', '', 'g'), ${query}, ${options})`;
  const rows = await db
    .select({ ...columns, snippet })
    .from(helpArticles)
    .where(and(published, topicCondition, sql`${helpArticles.search} @@ ${query}`))
    .orderBy(
      desc(sql`ts_rank(${helpArticles.search}, ${query})`),
      asc(helpArticles.sortOrder),
      asc(helpArticles.id),
    )
    .limit(MAX_HITS);
  return rows;
}
