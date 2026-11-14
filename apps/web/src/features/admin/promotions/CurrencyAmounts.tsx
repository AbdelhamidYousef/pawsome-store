import { NON_EUR_CURRENCIES } from '@store/shared';

import { Input } from '../../../components/ui/Input';

import type { ByCurrencyText, FieldErrors } from './code-form';

// One input per store currency other than EUR (today GBP), next to the EUR field it mirrors. The
// amounts are never converted: blank means the rule is not offered in that currency's stores.
export function CurrencyAmounts({
  label,
  field,
  hint,
  values,
  errors,
  onChange,
}: {
  /** "Amount off": the currency is appended, "Amount off (GBP)". */
  label: string;
  /** The API field, for error keys such as "valueByCurrency.GBP". */
  field: string;
  hint: string;
  values: ByCurrencyText;
  errors: FieldErrors;
  onChange: (next: ByCurrencyText) => void;
}) {
  return (
    <>
      {NON_EUR_CURRENCIES.map((c) => (
        <Input
          key={c}
          label={`${label} (${c})`}
          inputMode="decimal"
          hint={hint.replace('{currency}', c)}
          value={values[c] ?? ''}
          onChange={(e) => onChange({ ...values, [c]: e.target.value })}
          error={errors[`${field}.${c}`]}
          data-testid={`${field}-${c}`}
        />
      ))}
    </>
  );
}
