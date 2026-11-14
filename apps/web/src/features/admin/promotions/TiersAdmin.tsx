import type { AdminBulkTier } from '@store/shared';
import { formatMoney } from '@store/shared';
import { useState, type FormEvent } from 'react';

import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import { Dialog } from '../../../components/ui/Dialog';
import { Input } from '../../../components/ui/Input';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../components/ui/Toast';
import { FormAlert } from '../../auth/AuthCard';
import { adminErrorMessage } from '../errors';
import { centsToInput } from '../money-input';

import { byCurrencyToText, parseTierForm, type FieldErrors, type TierFormState } from './code-form';
import { CurrencyAmounts } from './CurrencyAmounts';
import { useAdminTiers, useDeleteTier, useSaveTier } from './queries';

function TierForm({ tier, onDone }: { tier: AdminBulkTier | undefined; onDone: () => void }) {
  const toast = useToast();
  const save = useSaveTier();
  const [form, setForm] = useState<TierFormState>(
    tier
      ? {
          min: centsToInput(tier.minCents),
          minBy: byCurrencyToText(tier.minByCurrency),
          percent: String(tier.percent),
          active: tier.active,
        }
      : { min: '', minBy: {}, percent: '', active: true },
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const parsed = parseTierForm(form);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    save.mutate(
      { id: tier?.id, input: parsed.input },
      {
        onSuccess: () => {
          toast.show(tier ? 'Tier saved' : 'Tier created', 'success');
          onDone();
        },
        onError: (err) => setServerError(adminErrorMessage(err)),
      },
    );
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      data-testid="admin-tier-form"
      className="flex flex-col gap-4"
    >
      <FormAlert message={serverError} />
      <Input
        label="Spend from (EUR)"
        inputMode="decimal"
        hint="The basket total where the discount starts, for example 75"
        value={form.min}
        onChange={(e) => setForm((f) => ({ ...f, min: e.target.value }))}
        error={errors.min}
      />
      <CurrencyAmounts
        label="Spend from"
        field="minByCurrency"
        hint="Empty: this tier does not apply in the {currency} store"
        values={form.minBy}
        errors={errors}
        onChange={(minBy) => setForm((f) => ({ ...f, minBy }))}
      />
      <Input
        label="Percentage off"
        inputMode="numeric"
        hint="A whole number, 1 to 100"
        value={form.percent}
        onChange={(e) => setForm((f) => ({ ...f, percent: e.target.value }))}
        error={errors.percent}
      />
      <Checkbox
        label="Active"
        checked={form.active}
        onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
      />
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {tier ? 'Save tier' : 'Create tier'}
        </Button>
      </div>
    </form>
  );
}

export function TiersAdmin() {
  const { data: tiers, isPending, isError, refetch } = useAdminTiers();
  const remove = useDeleteTier();
  const toast = useToast();
  const [editing, setEditing] = useState<AdminBulkTier | 'new' | null>(null);

  return (
    <section
      aria-labelledby="tiers-heading"
      data-testid="admin-tiers"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="tiers-heading" className="font-display text-lg font-bold">
          Bulk tiers
        </h3>
        <Button onClick={() => setEditing('new')}>New tier</Button>
      </div>
      <p className="text-muted">
        The bigger the basket, the bigger the discount. Each spend level can have one tier.
      </p>
      {isError ? (
        <div role="alert" className="text-danger">
          We could not load the tiers.{' '}
          <Button variant="secondary" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : isPending ? (
        <Skeleton className="h-32 w-full rounded-card" />
      ) : tiers.length === 0 ? (
        <p className="text-muted">No tiers yet.</p>
      ) : (
        <div className="relative overflow-x-auto rounded-card border border-line">
          <table className="w-full text-left">
            <thead className="bg-bg text-sm">
              <tr>
                <th className="p-3">Spend from</th>
                <th className="p-3">Discount</th>
                <th className="p-3">Status</th>
                <th className="p-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((t) => (
                <tr key={t.id} className="border-t border-line" data-testid="admin-tier-row">
                  <td className="p-3 font-semibold">
                    {[
                      formatMoney(t.minCents, 'EUR'),
                      ...Object.entries(t.minByCurrency).map(([c, cents]) => formatMoney(cents, c)),
                    ].join(' · ')}
                  </td>
                  <td className="p-3">{t.percent}% off</td>
                  <td className="p-3">
                    <Badge tone={t.active ? 'success' : 'neutral'}>
                      {t.active ? 'Live' : 'Off'}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="secondary" onClick={() => setEditing(t)}>
                        Edit{' '}
                        <span className="sr-only">tier from {formatMoney(t.minCents, 'EUR')}</span>
                      </Button>
                      <Button
                        variant="secondary"
                        loading={remove.isPending && remove.variables === t.id}
                        onClick={() => {
                          if (!window.confirm('Delete this tier?')) return;
                          remove.mutate(t.id, {
                            onSuccess: () => toast.show('Tier deleted', 'success'),
                            onError: (err) => toast.show(adminErrorMessage(err), 'error'),
                          });
                        }}
                      >
                        Delete{' '}
                        <span className="sr-only">tier from {formatMoney(t.minCents, 'EUR')}</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' || editing === null ? 'New tier' : 'Edit tier'}
        className="max-w-md"
      >
        {editing !== null && (
          <TierForm
            tier={editing === 'new' ? undefined : editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Dialog>
    </section>
  );
}
