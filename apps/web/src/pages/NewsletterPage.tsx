import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { ApiError } from '../api/client';
import { confirmNewsletter, unsubscribeNewsletter } from '../api/newsletter';
import { cancelStockAlert } from '../api/stock-alerts';
import { Container } from '../components/layout/Container';
import { Seo } from '../components/Seo';
import { Spinner } from '../components/ui/Spinner';
import { NewsletterForm } from '../features/newsletter/NewsletterForm';
import { useT, type StringKey } from '../i18n';
import { TEST_IDS } from '../lib/test-ids';

export function NewsletterPage() {
  const { t } = useT();
  return (
    <Container className="pb-16 pt-10 sm:pb-24 sm:pt-14" data-testid={TEST_IDS.pageNewsletter}>
      <Seo
        title={t('loyalty.newsletter.seoTitle')}
        description={t('loyalty.newsletter.seoDescription')}
        canonical="/newsletter"
      />
      <div className="mx-auto max-w-xl">
        <header className="text-center">
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">
            {t('loyalty.newsletter.pageTitle')}
          </h1>
          <p className="mt-3 text-lg text-muted">{t('loyalty.newsletter.pageText')}</p>
        </header>
        <div className="mt-8 rounded-card bg-surface p-6 shadow-card sm:p-8">
          <NewsletterForm />
        </div>
      </div>
    </Container>
  );
}

// The link in the email opens one of these; the click is the proof, so the page does the POST
// itself on arrival (once) and only then says what happened. A link that merely loaded a page
// and changed state on GET would be triggered by mail scanners.
function TokenPage({
  title,
  run,
  done,
  testId,
}: {
  title: StringKey;
  run: (token: string) => Promise<unknown>;
  done: (data: unknown) => StringKey;
  testId: string;
}) {
  const { t } = useT();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const mutation = useMutation({ mutationFn: run });
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !token) return;
    started.current = true;
    mutation.mutate(token);
  }, [token, mutation]);

  const expired = mutation.error instanceof ApiError && mutation.error.status === 410;
  return (
    <Container className="max-w-xl py-16 sm:py-24" data-testid={testId}>
      <Seo title={t(title)} noindex />
      <h1 className="font-display text-3xl font-bold">{t(title)}</h1>
      <div className="mt-4" aria-live="polite">
        {!token && <p>{t('loyalty.newsletter.token.incomplete')}</p>}
        {token && mutation.isPending && <Spinner label={t('loyalty.newsletter.token.working')} />}
        {mutation.isSuccess && (
          <p className="rounded-control border-2 border-success bg-success-soft p-4 font-semibold">
            {t(done(mutation.data))}
          </p>
        )}
        {mutation.isError && (
          <p role="alert" className="font-semibold text-danger">
            {expired
              ? t('loyalty.newsletter.token.expired')
              : t('loyalty.newsletter.token.invalid')}{' '}
            <Link to="/newsletter" className="underline">
              {t('loyalty.newsletter.token.signUpAgain')}
            </Link>
          </p>
        )}
      </div>
    </Container>
  );
}

export function NewsletterConfirmPage() {
  return (
    <TokenPage
      title="loyalty.newsletter.confirm.title"
      testId={TEST_IDS.newsletterConfirmed}
      run={confirmNewsletter}
      done={(s) =>
        s === 'already_confirmed'
          ? 'loyalty.newsletter.confirm.already'
          : 'loyalty.newsletter.confirm.done'
      }
    />
  );
}

export function NewsletterUnsubscribePage() {
  return (
    <TokenPage
      title="loyalty.newsletter.unsubscribe.title"
      testId={TEST_IDS.newsletterUnsubscribed}
      run={unsubscribeNewsletter}
      done={() => 'loyalty.newsletter.unsubscribe.done'}
    />
  );
}

export function StockAlertCancelPage() {
  return (
    <TokenPage
      title="loyalty.stockAlerts.cancel.title"
      testId={TEST_IDS.stockAlertCancelled}
      run={cancelStockAlert}
      done={() => 'loyalty.stockAlerts.cancel.done'}
    />
  );
}
