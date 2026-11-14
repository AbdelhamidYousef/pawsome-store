import { useState } from 'react';

import { Button } from '../../components/ui/Button';
import { useT } from '../../i18n';
import { TEST_IDS } from '../../lib/test-ids';
import { useStore } from '../stores/StoreContext';

import {
  DEMO_ACCOUNT_PASSWORD,
  DEMO_ACCOUNTS,
  TEST_CARD,
  demoAddress,
  demoCountry,
  demoPerson,
  demoVet,
  type DemoPerson,
} from './demo-data';
import { CopyValue, DemoHelperFrame } from './DemoHelper';
import { fieldValue, fillForm, focusIn } from './fill';

/** Registration: a fresh shopper each click, with the password shown so it can be reused. */
export function RegisterDemoHelper() {
  const { t } = useT();
  const [person, setPerson] = useState<DemoPerson | null>(null);
  const fill = () => {
    const next = demoPerson();
    fillForm('register', {
      firstName: next.firstName,
      lastName: next.lastName,
      email: next.email,
      password: next.password,
    });
    setPerson(next);
    focusIn('[data-testid="register-submit"]', 'register');
  };
  return (
    <DemoHelperFrame>
      <Button className="w-full" onClick={fill} data-testid={TEST_IDS.demoFillRegister}>
        {t('demo.register.fill')}
      </Button>
      {person && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-sm">{t('demo.register.filled')}</p>
          <CopyValue label={t('demo.email')} value={person.email} />
          <CopyValue
            label={t('demo.password')}
            value={person.password}
            testId={TEST_IDS.demoPassword}
          />
        </div>
      )}
    </DemoHelperFrame>
  );
}

/** Sign-in: one click per seeded shopper account (never the admin). */
export function LoginDemoHelper() {
  const { t } = useT();
  const use = (email: string) => {
    fillForm('login', { email, password: DEMO_ACCOUNT_PASSWORD });
    focusIn('[data-testid="login-submit"]', 'login');
  };
  return (
    <DemoHelperFrame intro={false}>
      <p className="text-sm">{t('demo.login.intro')}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {DEMO_ACCOUNTS.map((a) => (
          <li
            key={a.email}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control bg-surface px-3 py-2"
          >
            <span className="min-w-0 flex-1 break-all font-mono text-sm">{a.email}</span>
            <Button size="sm" onClick={() => use(a.email)} data-testid={TEST_IDS.demoFillLogin}>
              {t('demo.login.use', { name: a.name })}
            </Button>
          </li>
        ))}
      </ul>
      <div className="mt-2">
        <CopyValue label={t('demo.password')} value={DEMO_ACCOUNT_PASSWORD} />
      </div>
    </DemoHelperFrame>
  );
}

// Expiry and CVC take any valid value, so they need no copy button: an example and the rule.
function ExampleValue({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-control bg-surface px-3 py-2">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="whitespace-nowrap font-mono text-base font-semibold">{value}</p>
      <p className="text-xs text-muted">{hint}</p>
    </div>
  );
}

export type CheckoutStep = 1 | 2 | 3;

/** Checkout: what to do on the step that is open now. */
export function CheckoutDemoHelper({
  step,
  signedIn,
  requiresVet,
  className,
}: {
  className?: string;
  step: CheckoutStep;
  signedIn: boolean;
  requiresVet: boolean;
}) {
  const { t } = useT();
  const { shipCountries } = useStore();
  const title = t(
    step === 1
      ? 'checkout.step.details'
      : step === 2
        ? 'checkout.step.shipping'
        : 'checkout.step.payment',
  );

  const fillContact = () => {
    const person = demoPerson();
    const country = demoCountry(
      fieldValue('checkout-details', 'shippingAddress.country'),
      shipCountries,
    );
    const values: Record<string, string> = {
      'shippingAddress.fullName': `${person.firstName} ${person.lastName}`,
      'shippingAddress.phone': demoAddress(country).phone,
    };
    // A signed-in shopper's own email stays (the order belongs to their account).
    if (!signedIn || !fieldValue('checkout-details', 'email')) values.email = person.email;
    if (requiresVet) {
      const vet = demoVet();
      values['vetDetails.vetName'] = vet.vetName;
      values['vetDetails.clinic'] = vet.clinic;
      values['vetDetails.vetEmail'] = vet.vetEmail;
    }
    fillForm('checkout-details', values);
    focusIn('[name="shippingAddress.line1"]', 'checkout-details');
  };

  const fillAddress = () => {
    const country = demoCountry(
      fieldValue('checkout-details', 'shippingAddress.country'),
      shipCountries,
    );
    const address = demoAddress(country);
    fillForm('checkout-details', {
      'shippingAddress.country': address.country,
      'shippingAddress.line1': address.line1,
      'shippingAddress.postalCode': address.postalCode,
      'shippingAddress.city': address.city,
    });
    focusIn(`[data-testid="${TEST_IDS.checkoutContinueShipping}"]`, 'checkout-details');
  };

  const pickShipping = () => {
    const first = document.querySelector<HTMLInputElement>(
      `[data-testid="${TEST_IDS.shippingOption}"] input[type="radio"]`,
    );
    if (first && !first.checked) first.click();
    focusIn(`[data-testid="${TEST_IDS.checkoutContinuePayment}"]`);
  };

  return (
    <DemoHelperFrame className={className} intro={false}>
      <p className="font-display text-lg font-semibold">
        {t('demo.checkout.step', { number: step, title })}
      </p>
      {step === 1 && (
        <>
          <p className="mt-1 text-sm">{t('demo.checkout.detailsHint')}</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button onClick={fillContact} data-testid={TEST_IDS.demoFillContact}>
              {t('demo.checkout.contact')}
            </Button>
            <Button
              variant="secondary"
              onClick={fillAddress}
              data-testid={TEST_IDS.demoFillAddress}
            >
              {t('demo.checkout.address')}
            </Button>
          </div>
        </>
      )}
      {step === 2 && (
        <>
          <p className="mt-1 text-sm">{t('demo.checkout.deliveryHint')}</p>
          <Button className="mt-3" onClick={pickShipping} data-testid={TEST_IDS.demoPickShipping}>
            {t('demo.checkout.delivery')}
          </Button>
        </>
      )}
      {step === 3 && (
        <>
          <p className="mt-1 text-sm">{t('demo.checkout.paymentHint')}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-[2fr_1fr_1fr]">
            <div className="col-span-2 md:col-span-1">
              <CopyValue
                label={t('demo.checkout.cardNumber')}
                value={TEST_CARD.number}
                testId={TEST_IDS.demoTestCard}
              />
            </div>
            <ExampleValue
              label={t('demo.checkout.expiry')}
              value={TEST_CARD.expiry}
              hint={t('demo.checkout.expiryHint')}
            />
            <ExampleValue
              label={t('demo.checkout.cvc')}
              value={TEST_CARD.cvc}
              hint={t('demo.checkout.cvcHint')}
            />
          </div>
          <p className="mt-3 text-sm">{t('demo.checkout.why4242')}</p>
          <p className="mt-1 text-sm text-muted">{t('demo.checkout.otherMethods')}</p>
        </>
      )}
    </DemoHelperFrame>
  );
}
