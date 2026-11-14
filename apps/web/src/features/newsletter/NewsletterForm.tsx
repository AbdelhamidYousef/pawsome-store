import { NewsletterSubscribeSchema } from '@store/shared';
import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { ApiError } from '../../api/client';
import { subscribeNewsletter } from '../../api/newsletter';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { Input } from '../../components/ui/Input';
import { useT } from '../../i18n';
import { PETS } from '../../lib/pets';
import { TEST_IDS } from '../../lib/test-ids';
import { track } from '../../lib/track';
import { petName } from '../navigation/pet-names';

// The attribute value a pet carries (`small`, not the `small-pets` slug).
const PET_VALUE: Record<string, string> = { 'small-pets': 'small' };
const petValue = (slug: string): string => PET_VALUE[slug] ?? slug.replace(/s$/, '');

export function NewsletterForm() {
  const { t, tm } = useT();
  const [email, setEmail] = useState('');
  const [pets, setPets] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [consentError, setConsentError] = useState<string | undefined>();

  const send = useMutation({
    mutationFn: subscribeNewsletter,
    onSuccess: () => track({ name: 'newsletter_subscribe', pets: pets.length }),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = NewsletterSubscribeSchema.safeParse({ email, pets, consent, website });
    if (!parsed.success) {
      const emailIssue = parsed.error.issues.find((i) => i.path[0] === 'email');
      setError(emailIssue ? tm(emailIssue.message) : undefined);
      setConsentError(
        parsed.error.issues.some((i) => i.path[0] === 'consent')
          ? t('loyalty.newsletter.consentRequired')
          : undefined,
      );
      return;
    }
    setError(undefined);
    setConsentError(undefined);
    send.mutate(parsed.data);
  };

  if (send.isSuccess) {
    return (
      <p
        role="status"
        data-testid={TEST_IDS.newsletterDone}
        className="rounded-control border-2 border-success bg-success-soft p-4 font-semibold"
      >
        {t('loyalty.newsletter.done')}
      </p>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      data-testid={TEST_IDS.newsletterForm}
      className="relative flex max-w-xl flex-col gap-4"
    >
      {send.error && (
        <p role="alert" className="font-semibold text-danger">
          {send.error instanceof ApiError && send.error.status === 429
            ? t('loyalty.newsletter.tooMany')
            : t('loyalty.newsletter.failed')}
        </p>
      )}
      <Input
        label={t('loyalty.newsletter.email')}
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error}
      />
      {/* Pets as toggle chips: a real checkbox, transparent and stretched over its chip (so a click,
          a tap or a test's `check()` hits the input itself), styled through `peer`. */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">{t('loyalty.newsletter.pets')}</legend>
        <div className="flex flex-wrap gap-2">
          {PETS.map((p) => {
            const value = petValue(p.slug);
            const checked = pets.includes(value);
            return (
              <label key={p.slug} className="relative cursor-pointer">
                <input
                  type="checkbox"
                  className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  checked={checked}
                  onChange={(e) =>
                    setPets((cur) =>
                      e.target.checked ? [...cur, value] : cur.filter((v) => v !== value),
                    )
                  }
                />
                <span className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-line bg-surface px-4 font-semibold text-ink transition-colors hover:border-muted peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:text-primary-strong peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink">
                  {checked && (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
                      <path
                        d="M5 12.5l4.2 4.2L19 7"
                        stroke="currentColor"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  {petName(t, p)}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <Checkbox
        label={t('loyalty.newsletter.consent')}
        checked={consent}
        onChange={(e) => setConsent(e.target.checked)}
        error={consentError}
      />
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          {t('loyalty.newsletter.honeypot')}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>
      <Button type="submit" loading={send.isPending}>
        {t('loyalty.newsletter.submit')}
      </Button>
    </form>
  );
}
