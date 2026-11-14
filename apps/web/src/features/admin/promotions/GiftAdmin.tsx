import { formatMoney } from '@store/shared';
import { useState, type FormEvent } from 'react';

import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../components/ui/Toast';
import { FormAlert } from '../../auth/AuthCard';
import { adminErrorMessage } from '../errors';
import { centsToInput } from '../money-input';

import {
  byCurrencyToText,
  parseGiftForm,
  type ByCurrencyText,
  type FieldErrors,
} from './code-form';
import { CurrencyAmounts } from './CurrencyAmounts';
import { useAdminGift, useClearGift, useSetGift } from './queries';

export function GiftAdmin() {
  const { data: rule, isPending, isError, refetch } = useAdminGift();
  const set = useSetGift();
  const clear = useClearGift();
  const toast = useToast();
  // null = untouched: the inputs then show the saved rule.
  const [draft, setDraft] = useState<{
    threshold: string;
    thresholdBy: ByCurrencyText;
    variant: string;
  } | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const form = draft ?? {
    threshold: rule ? centsToInput(rule.thresholdCents) : '',
    thresholdBy: rule ? byCurrencyToText(rule.thresholdByCurrency) : {},
    variant: rule?.sku ?? '',
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const parsed = parseGiftForm(form);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    set.mutate(parsed.input, {
      onSuccess: () => {
        setDraft(null);
        toast.show('Gift rule saved', 'success');
      },
      onError: (err) => setServerError(adminErrorMessage(err)),
    });
  };

  return (
    <section
      aria-labelledby="gift-heading"
      data-testid="admin-gift"
      className="flex flex-col gap-4"
    >
      <h3 id="gift-heading" className="font-display text-lg font-bold">
        Free gift
      </h3>
      <p className="text-muted">
        One free item is added to baskets that reach the spend. Only one rule can be on at a time.
      </p>
      {isError ? (
        <div role="alert" className="text-danger">
          We could not load the gift rule.{' '}
          <Button variant="secondary" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : isPending ? (
        <Skeleton className="h-32 w-full rounded-card" />
      ) : (
        <>
          <p data-testid="gift-status" aria-live="polite" className="font-semibold">
            {rule
              ? `On: a free ${rule.productName} (${rule.variantName}, ${rule.sku}) from ${[
                  formatMoney(rule.thresholdCents, 'EUR'),
                  ...Object.entries(rule.thresholdByCurrency).map(([c, cents]) =>
                    formatMoney(cents, c),
                  ),
                ].join(' / ')}.`
              : 'Off: no gift is given at the moment.'}
          </p>
          <form
            onSubmit={submit}
            noValidate
            data-testid="admin-gift-form"
            className="flex max-w-md flex-col gap-4"
          >
            <FormAlert message={serverError} />
            <Input
              label="Spend from (EUR)"
              inputMode="decimal"
              hint="For example 40"
              value={form.threshold}
              onChange={(e) => setDraft({ ...form, threshold: e.target.value })}
              error={errors.threshold}
            />
            <CurrencyAmounts
              label="Spend from"
              field="thresholdByCurrency"
              hint="Empty: no gift in the {currency} store"
              values={form.thresholdBy}
              errors={errors}
              onChange={(thresholdBy) => setDraft({ ...form, thresholdBy })}
            />
            <Input
              label="Gift variant SKU"
              hint="Copy the SKU from the product's variants. The variant must be active."
              value={form.variant}
              onChange={(e) => setDraft({ ...form, variant: e.target.value })}
              error={errors.variant}
            />
            <div className="flex flex-wrap gap-3">
              <Button type="submit" loading={set.isPending}>
                {rule ? 'Save gift rule' : 'Turn on gift'}
              </Button>
              {rule && (
                <Button
                  variant="secondary"
                  loading={clear.isPending}
                  onClick={() =>
                    clear.mutate(undefined, {
                      onSuccess: () => {
                        setDraft(null);
                        toast.show('Gift switched off', 'success');
                      },
                      onError: (err) => toast.show(adminErrorMessage(err), 'error'),
                    })
                  }
                >
                  Switch off
                </Button>
              )}
            </div>
          </form>
        </>
      )}
    </section>
  );
}
