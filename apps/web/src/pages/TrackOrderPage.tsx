import { TrackOrderBodySchema, type TrackedOrder } from '@store/shared';
import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ApiError } from '../api/client';
import { trackOrder } from '../api/tracking';
import { Container } from '../components/layout/Container';
import { Seo } from '../components/Seo';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { FormAlert } from '../features/auth/AuthCard';
import { TrackedOrderView } from '../features/tracking/TrackedOrderView';
import { useT, type TFunction } from '../i18n';
import { TEST_IDS } from '../lib/test-ids';
import { track } from '../lib/track';

// Same words for "wrong email" and "no such order": the server gives one answer, the page gives one
// message, so nothing here helps someone guess which order numbers exist.
function messageFor(error: unknown, t: TFunction): string {
  if (error instanceof ApiError && error.status === 404) return t('account.tracking.notFound');
  if (error instanceof ApiError && error.status === 429) return t('account.tracking.tooMany');
  return t('account.tracking.failed');
}

export default function TrackOrderPage() {
  const [params] = useSearchParams();
  const { t } = useT();
  // The confirmation email links here with the number filled in; the email is never in a URL.
  const [orderNumber, setOrderNumber] = useState(params.get('number') ?? '');
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackedOrder | null>(null);

  const lookup = useMutation({
    mutationFn: trackOrder,
    onSuccess: (order) => {
      setResult(order);
      track({ name: 'track_order', status: order.status });
    },
    onError: () => setResult(null),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = TrackOrderBodySchema.safeParse({ orderNumber, email });
    if (!parsed.success) {
      setFieldError(t('account.tracking.fieldError'));
      return;
    }
    setFieldError(null);
    lookup.mutate(parsed.data);
  };

  return (
    <Container className="pb-16 pt-10 sm:pb-24 sm:pt-14" data-testid={TEST_IDS.pageTrackOrder}>
      <Seo
        title={t('account.tracking.seoTitle')}
        description={t('account.tracking.seoDescription')}
        noindex
      />
      <div className="mx-auto max-w-xl">
        <header className="text-center">
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">
            {t('account.tracking.seoTitle')}
          </h1>
          <p className="mt-3 text-lg text-muted">{t('account.tracking.intro')}</p>
        </header>
        <form
          onSubmit={submit}
          noValidate
          className="mt-8 flex flex-col gap-4 rounded-card bg-surface p-6 shadow-card sm:p-8"
        >
          <FormAlert message={fieldError ?? (lookup.error ? messageFor(lookup.error, t) : null)} />
          <Input
            label={t('account.tracking.orderNumber')}
            placeholder="PW-2026-000123"
            autoComplete="off"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            data-testid={TEST_IDS.trackOrderNumber}
          />
          <Input
            label={t('account.tracking.email')}
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid={TEST_IDS.trackEmail}
          />
          <Button type="submit" loading={lookup.isPending} data-testid={TEST_IDS.trackSubmit}>
            {t('account.tracking.submit')}
          </Button>
        </form>
      </div>
      {result && (
        <div className="mx-auto mt-10 max-w-3xl">
          <TrackedOrderView order={result} />
        </div>
      )}
    </Container>
  );
}
