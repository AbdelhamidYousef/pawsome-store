import { HELP_TOPICS, HelpTopicSchema, type HelpTopic } from '@store/shared';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Container } from '../components/layout/Container';
import { Seo } from '../components/Seo';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { HelpAccordion } from '../features/help/HelpAccordion';
import { useHelpSearch } from '../features/help/queries';
import { useT, type StringKey } from '../i18n';
import { TEST_IDS } from '../lib/test-ids';
import { track } from '../lib/track';

const DEBOUNCE_MS = 300;

const TOPIC_KEYS: Record<HelpTopic, StringKey> = {
  shipping: 'content.help.topic.shipping',
  returns: 'content.help.topic.returns',
  payments: 'content.help.topic.payments',
  accounts: 'content.help.topic.accounts',
};

const tab =
  'inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-line bg-surface px-4 font-semibold transition-colors hover:border-ink/40 aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-surface';

// The query and topic live in the URL (`/help?q=refund&topic=returns`): a search can be shared,
// reloaded and walked with Back. The box keeps its own text and writes the URL after a pause, so
// typing does not send a request (or a history entry) per keystroke.
export default function HelpPage() {
  const [params, setParams] = useSearchParams();
  const { t, tn } = useT();
  const q = params.get('q') ?? '';
  const parsedTopic = HelpTopicSchema.safeParse(params.get('topic'));
  const topic: HelpTopic | undefined = parsedTopic.success ? parsedTopic.data : undefined;

  const [text, setText] = useState(q);
  // Back/forward changes the URL; mirror it into the box (without fighting the user's typing).
  // Done during render, the documented way to adjust state when a value changes.
  const [seenQ, setSeenQ] = useState(q);
  if (q !== seenQ) {
    setSeenQ(q);
    if (text.trim() !== q.trim()) setText(q);
  }
  useEffect(() => {
    if (text.trim() === q.trim()) return;
    const id = setTimeout(() => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (text.trim()) next.set('q', text.trim());
          else next.delete('q');
          return next;
        },
        { replace: true },
      );
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [text, q, setParams]);

  const { data, isPending, error, refetch } = useHelpSearch({ q: q.trim() || undefined, topic });

  useEffect(() => {
    if (data && q.trim()) track({ name: 'help_search', query: q.trim(), results: data.length });
    // Once per answered query, not per render.
  }, [data, q]);

  const hrefForTopic = (next: HelpTopic | undefined) => {
    const search = new URLSearchParams();
    if (q) search.set('q', q);
    if (next) search.set('topic', next);
    const s = search.toString();
    return `/help${s ? `?${s}` : ''}`;
  };

  return (
    <Container className="pb-16 pt-10 sm:pb-24 sm:pt-14" data-testid={TEST_IDS.pageHelp}>
      <Seo title={t('content.help.title')} description={t('content.help.seoDescription')} />
      <div className="mx-auto max-w-3xl">
        <header className="text-center">
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">
            {t('content.help.title')}
          </h1>
          <p className="mt-3 text-lg text-muted">{t('content.help.intro')}</p>
        </header>

        <form
          role="search"
          aria-label={t('content.help.searchLabel')}
          className="mx-auto mt-8 max-w-xl"
          onSubmit={(e) => e.preventDefault()}
        >
          <Input
            label={t('content.help.searchInput')}
            type="search"
            value={text}
            maxLength={100}
            data-testid={TEST_IDS.helpSearch}
            onChange={(e) => setText(e.target.value)}
          />
        </form>

        <nav
          aria-label={t('content.help.topics')}
          className="-mx-4 mt-6 overflow-x-auto px-4 pb-1 sm:mx-0 sm:overflow-visible sm:px-0"
        >
          <ul className="flex gap-2 sm:flex-wrap sm:justify-center">
            <li>
              <Link
                to={hrefForTopic(undefined)}
                aria-current={topic ? undefined : 'page'}
                data-testid={TEST_IDS.helpTopic}
                className={tab}
              >
                {t('content.help.allTopics')}
              </Link>
            </li>
            {HELP_TOPICS.map((topicValue) => (
              <li key={topicValue}>
                <Link
                  to={hrefForTopic(topicValue)}
                  aria-current={topic === topicValue ? 'page' : undefined}
                  data-testid={TEST_IDS.helpTopic}
                  className={tab}
                >
                  {t(TOPIC_KEYS[topicValue])}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section className="mt-10" aria-live="polite" aria-label={t('content.help.articles')}>
          {isPending && !error && <Skeleton className="h-48 w-full rounded-card" />}
          {error && !data && (
            <div role="alert">
              <p className="font-semibold text-danger">{t('content.help.error')}</p>
              <Button className="mt-2" variant="secondary" onClick={() => void refetch()}>
                {t('content.help.retry')}
              </Button>
            </div>
          )}
          {data && data.length === 0 && (
            <div data-testid={TEST_IDS.helpNoResults}>
              <p className="font-semibold">
                {q ? t('content.help.nothingFound', { q }) : t('content.help.noArticles')}
              </p>
              <p className="mt-1 text-muted">
                {t('content.help.tryDifferent')}{' '}
                <Link to="/help" className="font-semibold text-primary-strong underline">
                  {t('content.help.browseAll')}
                </Link>
                {t('content.help.stuck')}{' '}
                <Link
                  to="/contact"
                  className="font-semibold text-primary-strong underline"
                  data-testid={TEST_IDS.helpContact}
                >
                  {t('content.help.contact')}
                </Link>{' '}
                {t('content.help.contactRest')}
              </p>
            </div>
          )}
          {data && data.length > 0 && (
            <>
              {q && (
                <p className="mb-2 text-sm text-muted">
                  {tn('content.help.results', data.length, { q })}
                </p>
              )}
              <HelpAccordion hits={data} searching={!!q.trim()} />
            </>
          )}
        </section>

        <aside
          aria-labelledby="help-more"
          className="mt-12 flex flex-col items-start gap-4 rounded-card bg-primary-soft p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"
        >
          <div>
            <h2 id="help-more" className="font-display text-xl font-semibold">
              {t('content.help.moreTitle')}
            </h2>
            <p className="mt-1 text-ink/80">{t('content.help.moreBody')}</p>
          </div>
          <Link
            to="/contact"
            className="inline-flex min-h-11 shrink-0 items-center rounded-control bg-primary px-5 font-semibold text-white hover:bg-primary-hover"
          >
            {t('content.help.moreCta')}
          </Link>
        </aside>
      </div>
    </Container>
  );
}
