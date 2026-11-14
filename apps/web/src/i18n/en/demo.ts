import type { Dictionary } from '../types';

// The demo helper panel on sign-in, registration and checkout (a portfolio store: visitors try it
// with made-up data). Keys are appended at the end, one per line.
export const demo = {
  'demo.badge': 'Test store',
  'demo.title': 'Demo helper',
  'demo.intro': 'Skip the typing: fill this form with made-up details in one click.',
  'demo.collapse': 'Fold away',
  'demo.expand': 'Demo helper: fill this form',
  'demo.close': 'Close the demo helper',
  'demo.copy': 'Copy',
  'demo.copyAria': 'Copy {label}',
  'demo.copied': 'Copied {label}',
  'demo.copyFailed': 'Could not copy. Select the text and copy it by hand.',
  'demo.email': 'Email',
  'demo.password': 'Password',
  'demo.register.fill': 'Fill with a new demo shopper',
  'demo.register.filled': 'Filled in. Keep the password if you want to sign in again later:',
  'demo.login.intro': 'Sign in as one of the demo shoppers (orders, points and pets included):',
  'demo.login.use': 'Use {name}',
  'demo.checkout.step': 'Step {number}: {title}',
  'demo.checkout.contact': 'Fill contact',
  'demo.checkout.address': 'Fill address',
  'demo.checkout.detailsHint':
    'A made-up name, email and phone, then an address in a country this store ships to.',
  'demo.checkout.delivery': 'Pick the cheapest option',
  'demo.checkout.deliveryHint': 'Any option works: nothing is ever shipped from this demo.',
  'demo.checkout.paymentHint':
    "Card fields sit inside Stripe's secure frame, so no page can fill them. Type Stripe's test card:",
  'demo.checkout.cardNumber': 'Card number',
  'demo.checkout.expiry': 'Expiry',
  'demo.checkout.expiryHint': 'or any future date',
  'demo.checkout.cvc': 'CVC',
  'demo.checkout.cvcHint': 'or any 3 digits',
  'demo.checkout.why4242':
    'Why 4242? Payments run in Stripe test mode, which only accepts its own test numbers: a real-looking card such as 4111 1111 1111 1111 is declined. No money moves.',
  'demo.checkout.otherMethods':
    'Other test methods (iDEAL, SEPA Direct Debit, Klarna…) appear in the payment form when they are switched on.',
} satisfies Dictionary;
