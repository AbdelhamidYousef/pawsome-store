import type { AdminDiscountCode, DiscountKind } from '@store/shared';
import { useState, type FormEvent } from 'react';

import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import { Dialog } from '../../../components/ui/Dialog';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../components/ui/Toast';
import { FormAlert } from '../../auth/AuthCard';
import { adminErrorMessage } from '../errors';

import {
  codeToForm,
  describeCode,
  emptyCodeForm,
  parseCodeForm,
  previewForm,
  type CodeFormState,
  type FieldErrors,
} from './code-form';
import { CurrencyAmounts } from './CurrencyAmounts';
import { useAdminCodes, useDeleteCode, useSaveCode } from './queries';

const KIND_LABEL: Record<DiscountKind, string> = {
  percent: 'Percentage off',
  fixed: 'Fixed amount off',
  free_shipping: 'Free shipping',
};

function CodeForm({ code, onDone }: { code: AdminDiscountCode | undefined; onDone: () => void }) {
  const toast = useToast();
  const save = useSaveCode();
  const [form, setForm] = useState<CodeFormState>(code ? codeToForm(code) : emptyCodeForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const text = (key: keyof CodeFormState) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  const flag = (key: keyof CodeFormState) => (e: { target: { checked: boolean } }) =>
    setForm((f) => ({ ...f, [key]: e.target.checked }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const parsed = parseCodeForm(form);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    save.mutate(
      { id: code?.id, input: parsed.input },
      {
        onSuccess: () => {
          toast.show(code ? 'Code saved' : 'Code created', 'success');
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
      data-testid="admin-code-form"
      className="flex flex-col gap-4"
    >
      <FormAlert message={serverError} />
      <p
        data-testid="code-preview"
        aria-live="polite"
        className="rounded-control border-2 border-line bg-bg p-3 font-semibold"
      >
        <span className="sr-only">Preview: </span>
        {previewForm(form, code?.liveRedemptions ?? 0)}
      </p>
      <Input
        label="Code"
        hint="Letters, numbers, - and _. Not case-sensitive."
        value={form.code}
        onChange={text('code')}
        error={errors.code}
        autoCapitalize="characters"
      />
      <Select label="Type" value={form.kind} onChange={text('kind')}>
        {(Object.keys(KIND_LABEL) as DiscountKind[]).map((k) => (
          <option key={k} value={k}>
            {KIND_LABEL[k]}
          </option>
        ))}
      </Select>
      {form.kind === 'percent' && (
        <Input
          label="Percentage"
          inputMode="numeric"
          hint="A whole number, 1 to 100"
          value={form.value}
          onChange={text('value')}
          error={errors.value}
        />
      )}
      {form.kind === 'fixed' && (
        <Input
          label="Amount off (EUR)"
          inputMode="decimal"
          hint="For example 5 or 5.50"
          value={form.value}
          onChange={text('value')}
          error={errors.value}
        />
      )}
      {form.kind === 'fixed' && (
        <CurrencyAmounts
          label="Amount off"
          field="valueByCurrency"
          hint="Empty: this code does not work in the {currency} store"
          values={form.valueBy}
          errors={errors}
          onChange={(valueBy) => setForm((f) => ({ ...f, valueBy }))}
        />
      )}
      <Input
        label="Minimum spend (EUR)"
        inputMode="decimal"
        hint="Empty for no minimum"
        value={form.minSpend}
        onChange={text('minSpend')}
        error={errors.minSpendCents ?? errors.minSpend}
      />
      <CurrencyAmounts
        label="Minimum spend"
        field="minSpendByCurrency"
        hint="Empty: no minimum if the EUR one is empty, otherwise not offered in {currency}"
        values={form.minSpendBy}
        errors={errors}
        onChange={(minSpendBy) => setForm((f) => ({ ...f, minSpendBy }))}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Starts (UTC)"
          type="datetime-local"
          value={form.startsAt}
          onChange={text('startsAt')}
          error={errors.startsAt}
        />
        <Input
          label="Ends (UTC)"
          type="datetime-local"
          value={form.endsAt}
          onChange={text('endsAt')}
          error={errors.endsAt}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Total uses"
          inputMode="numeric"
          hint="Empty for unlimited"
          value={form.maxUses}
          onChange={text('maxUses')}
          error={errors.maxUses}
        />
        <Input
          label="Uses per customer"
          inputMode="numeric"
          hint="Empty for unlimited"
          value={form.perCustomerMax}
          onChange={text('perCustomerMax')}
          error={errors.perCustomerMax}
        />
      </div>
      <fieldset className="flex flex-col">
        <legend className="sr-only">Conditions</legend>
        <Checkbox
          label="First order only"
          checked={form.firstOrderOnly}
          onChange={flag('firstOrderOnly')}
        />
        <Checkbox
          label="Does not apply to items already on sale"
          checked={form.excludeSaleItems}
          onChange={flag('excludeSaleItems')}
        />
        <Checkbox label="Active" checked={form.active} onChange={flag('active')} />
      </fieldset>
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {code ? 'Save code' : 'Create code'}
        </Button>
      </div>
    </form>
  );
}

function statusOf(c: AdminDiscountCode): { label: string; tone: 'success' | 'neutral' | 'danger' } {
  if (c.archivedAt) return { label: 'Archived', tone: 'neutral' };
  if (!c.active) return { label: 'Off', tone: 'neutral' };
  if (c.endsAt && Date.parse(c.endsAt) < Date.now()) return { label: 'Expired', tone: 'danger' };
  if (c.startsAt && Date.parse(c.startsAt) > Date.now())
    return { label: 'Scheduled', tone: 'neutral' };
  return { label: 'Live', tone: 'success' };
}

export function CodesAdmin() {
  const { data: codes, isPending, isError, refetch } = useAdminCodes();
  const remove = useDeleteCode();
  const toast = useToast();
  const [editing, setEditing] = useState<AdminDiscountCode | 'new' | null>(null);

  return (
    <section
      aria-labelledby="codes-heading"
      data-testid="admin-codes"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="codes-heading" className="font-display text-lg font-bold">
          Discount codes
        </h3>
        <Button onClick={() => setEditing('new')}>New code</Button>
      </div>
      {isError ? (
        <div role="alert" className="text-danger">
          We could not load the codes.{' '}
          <Button variant="secondary" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : isPending ? (
        <Skeleton className="h-40 w-full rounded-card" />
      ) : codes.length === 0 ? (
        <p className="text-muted">No codes yet. Create the first one.</p>
      ) : (
        <div className="relative overflow-x-auto rounded-card border border-line">
          <table className="w-full text-left">
            <thead className="bg-bg text-sm">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">What it does</th>
                <th className="p-3">Status</th>
                <th className="p-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => {
                const status = statusOf(c);
                return (
                  <tr
                    key={c.id}
                    className="border-t border-line align-top"
                    data-testid="admin-code-row"
                  >
                    <td className="whitespace-nowrap p-3 font-semibold">{c.code}</td>
                    <td className="min-w-48 p-3 text-muted">
                      {describeCode(c, c.liveRedemptions)}
                    </td>
                    <td className="p-3">
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="secondary" onClick={() => setEditing(c)}>
                          Edit <span className="sr-only">{c.code}</span>
                        </Button>
                        {!c.archivedAt && (
                          <Button
                            variant="secondary"
                            loading={remove.isPending && remove.variables === c.id}
                            onClick={() => {
                              if (
                                !window.confirm(
                                  `Delete ${c.code}? A code that orders have used is archived instead, so those orders keep their history.`,
                                )
                              )
                                return;
                              remove.mutate(c.id, {
                                onSuccess: (outcome) =>
                                  toast.show(
                                    outcome === 'archived' ? 'Code archived' : 'Code deleted',
                                    'success',
                                  ),
                                onError: (err) => toast.show(adminErrorMessage(err), 'error'),
                              });
                            }}
                          >
                            Delete <span className="sr-only">{c.code}</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' || editing === null ? 'New code' : `Edit ${editing.code}`}
        className="max-w-xl"
      >
        {editing !== null && (
          <CodeForm
            code={editing === 'new' ? undefined : editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Dialog>
    </section>
  );
}
