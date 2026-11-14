import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useT } from '../../i18n';
import { useFormat } from '../../i18n/format';
import { TEST_IDS } from '../../lib/test-ids';
import { useStore } from '../stores/StoreContext';

import {
  DetailsSchema,
  DetailsWithVetSchema,
  shippingCountries,
  type Details,
  type DetailsInput,
} from './details';
import { VetDetailsForm } from './VetDetailsForm';

// Step 1. Validation is the API's own schema, so "what the form accepts" and "what the server
// accepts" cannot drift; the server stays the judge (it re-validates and prices everything).
// Guests see a sign-in hint, signed-in shoppers a "save this address" box.
export function DetailsStep({
  defaults,
  signedIn,
  requiresVet = false,
  saveAddress,
  onSaveAddressChange,
  onSubmit,
}: {
  defaults: DetailsInput;
  signedIn: boolean;
  /** The cart holds an item that needs a vet's approval: the vet's details become required. */
  requiresVet?: boolean;
  saveAddress: boolean;
  onSaveAddressChange: (value: boolean) => void;
  onSubmit: (details: Details) => void;
}) {
  const { t } = useT();
  const { locale } = useFormat();
  const { shipCountries } = useStore();
  const countries = useMemo(
    () => shippingCountries(locale, shipCountries),
    [locale, shipCountries],
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DetailsInput, unknown, Details>({
    resolver: zodResolver(requiresVet ? DetailsWithVetSchema : DetailsSchema),
    // The vet fields exist only when the cart needs a vet; blank inputs, never an invalid object.
    defaultValues: requiresVet
      ? {
          ...defaults,
          vetDetails: defaults.vetDetails ?? { vetName: '', clinic: '', vetEmail: '' },
        }
      : defaults,
  });
  const a = errors.shippingAddress;

  return (
    <form
      onSubmit={(e) => void handleSubmit(onSubmit)(e)}
      noValidate
      data-demo-form="checkout-details"
      className="flex flex-col gap-4"
    >
      {!signedIn && (
        <p className="text-sm" data-testid={TEST_IDS.checkoutSignInHint}>
          {t('checkout.details.haveAccount')}{' '}
          <Link to="/login?next=/checkout" className="font-semibold text-primary-strong underline">
            {t('checkout.details.signIn')}
          </Link>{' '}
          {t('checkout.details.signInRest')}
        </p>
      )}
      <Input
        label={t('checkout.details.email')}
        type="email"
        autoComplete="email"
        hint={t('checkout.details.emailHint')}
        error={errors.email?.message}
        data-testid={TEST_IDS.checkoutEmail}
        {...register('email')}
      />
      <Input
        label={t('checkout.details.fullName')}
        autoComplete="shipping name"
        error={a?.fullName?.message}
        {...register('shippingAddress.fullName')}
      />
      <Input
        label={t('checkout.details.line1')}
        autoComplete="shipping address-line1"
        error={a?.line1?.message}
        {...register('shippingAddress.line1')}
      />
      <Input
        label={t('checkout.details.line2')}
        autoComplete="shipping address-line2"
        error={a?.line2?.message}
        {...register('shippingAddress.line2')}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label={t('checkout.details.postalCode')}
          autoComplete="shipping postal-code"
          error={a?.postalCode?.message}
          {...register('shippingAddress.postalCode')}
        />
        <Input
          label={t('checkout.details.city')}
          autoComplete="shipping address-level2"
          error={a?.city?.message}
          {...register('shippingAddress.city')}
        />
      </div>
      <Input
        label={t('checkout.details.region')}
        autoComplete="shipping address-level1"
        error={a?.region?.message}
        {...register('shippingAddress.region')}
      />
      <Select
        label={t('checkout.details.country')}
        autoComplete="shipping country"
        hint={t('checkout.details.countryHint')}
        error={a?.country?.message}
        {...register('shippingAddress.country')}
      >
        {countries.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </Select>
      <Input
        label={t('checkout.details.phone')}
        type="tel"
        autoComplete="shipping tel"
        hint={t('checkout.details.phoneHint')}
        error={a?.phone?.message}
        {...register('shippingAddress.phone')}
      />
      {requiresVet && <VetDetailsForm register={register} errors={errors.vetDetails} />}
      {signedIn && (
        <Checkbox
          label={t('checkout.details.saveAddress')}
          checked={saveAddress}
          onChange={(e) => onSaveAddressChange(e.target.checked)}
          data-testid={TEST_IDS.checkoutSaveAddress}
        />
      )}
      <Button
        type="submit"
        size="lg"
        className="self-stretch sm:self-end"
        data-testid={TEST_IDS.checkoutContinueShipping}
      >
        {t('checkout.details.continue')}
      </Button>
    </form>
  );
}
