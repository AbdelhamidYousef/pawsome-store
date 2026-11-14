import type { Dictionary } from '../types';

export const checkout = {
  // ---------- page ----------
  'checkout.title': 'Checkout',
  'checkout.backToCart': 'Back to cart',
  'checkout.loading': 'Loading checkout',
  'checkout.cartLoadError': 'We could not load your cart.',
  'checkout.tryAgain': 'Try again',
  'checkout.empty': 'Your cart is empty, so there is nothing to check out yet.',
  'checkout.continueShopping': 'Continue shopping',
  'checkout.soldOut': 'An item in your cart has sold out. Remove it to continue.',
  'checkout.reviewCart': 'Review your cart',

  // ---------- step cards ----------
  'checkout.step.details': 'Contact and address',
  'checkout.step.shipping': 'Shipping method',
  'checkout.step.payment': 'Payment',
  'checkout.step.edit': 'Edit',
  'checkout.step.editAria': 'Edit {title}',
  'checkout.step.editDetails': 'Edit contact and address',
  'checkout.step.editShipping': 'Edit shipping method',
  'checkout.step.vetSummary': 'Vet: {name}, {clinic}',

  // ---------- step 1: details ----------
  'checkout.details.haveAccount': 'Have an account?',
  'checkout.details.signIn': 'Sign in',
  'checkout.details.signInRest': 'to use your saved details. Or just carry on as a guest.',
  'checkout.details.email': 'Email',
  'checkout.details.emailHint': 'We send your order confirmation here.',
  'checkout.details.fullName': 'Full name',
  'checkout.details.line1': 'Address line 1',
  'checkout.details.line2': 'Address line 2 (optional)',
  'checkout.details.postalCode': 'Postal code',
  'checkout.details.city': 'City',
  'checkout.details.region': 'Region (optional)',
  'checkout.details.country': 'Country',
  'checkout.details.countryHint': 'We ship inside Europe.',
  'checkout.details.phone': 'Phone (optional)',
  'checkout.details.phoneHint': 'Only for the courier.',
  'checkout.details.saveAddress': 'Save this address to my account',
  'checkout.details.continue': 'Continue to shipping',

  // ---------- vet ----------
  'checkout.vet.bannerTitle': "Needs a vet's okay.",
  'checkout.vet.bannerBody':
    'After you pay, we hold this order until a vet approves it, then pack it. Most requests are approved within one working day.',
  'checkout.vet.legend': 'Your vet',
  'checkout.vet.intro':
    "An item in your cart needs a vet's okay before we pack it. We will email you as soon as it is decided.",
  'checkout.vet.demo': 'Most requests are approved within one working day.',
  'checkout.vet.name': "Vet's name",
  'checkout.vet.clinic': 'Clinic',
  'checkout.vet.email': "Vet's email",

  // ---------- step 2: shipping ----------
  'checkout.shipping.loading': 'Loading shipping options',
  'checkout.shipping.loadError': 'We could not load the shipping options.',
  'checkout.shipping.none': 'We cannot ship this order to that country right now.',
  'checkout.shipping.legend': 'Shipping method',
  'checkout.shipping.etaSame': {
    one: '{count} working day',
    other: '{count} working days',
  },
  'checkout.shipping.etaRange': {
    one: '{min}-{max} working days',
    other: '{min}-{max} working days',
  },
  'checkout.shipping.free': 'Free',
  'checkout.shipping.continue': 'Continue to payment',
  'checkout.shipping.tryAgain': 'Try again',
  'checkout.roundUp.label': 'Round my total up to the next euro for Whisker Hollow Rescue',
  'checkout.roundUp.hint': 'The extra cents show as a separate line on your order.',

  // ---------- step 3: payment ----------
  'checkout.payment.pay': 'Pay {amount}',
  'checkout.payment.testMode':
    'Test mode: use card 4242 4242 4242 4242, any future date and any CVC. No real money moves.',
  'checkout.payment.notConfiguredTitle': "Payments aren't configured in this environment",
  'checkout.payment.notConfiguredBody':
    "Card payments aren't switched on in this copy of the shop yet, so orders can't be placed here. Everything before this step works as normal.",
  'checkout.payment.preparing': 'Preparing your payment…',
  'checkout.payment.loadFailedTitle': 'We could not load the secure payment form',
  'checkout.payment.loadFailedBody':
    "Nothing was charged and your order is saved. Check your connection (an ad or script blocker can also stop Stripe's form from loading), then try again.",
  'checkout.payment.tryAgain': 'Try again',
  'checkout.payment.failed':
    'Something went wrong while paying. You have not been charged; please try again.',
  'checkout.payment.unreachable':
    'We could not reach the payment provider. Check your connection and try again.',

  // ---------- summary ----------
  'checkout.summary.aria': 'Order summary',
  'checkout.summary.title': 'Order summary',
  'checkout.summary.codeBack': 'Back to your cart to change the code',
  'checkout.summary.itemsRegion': 'Items in your order ({count}), scrollable',
  'checkout.summary.qty': 'Qty {quantity}',
  'checkout.summary.subtotal': 'Subtotal',
  'checkout.summary.shipping': 'Shipping',
  'checkout.summary.shippingNext': 'Next step',
  'checkout.summary.discount': 'Discount',
  'checkout.summary.donation': 'Donation',
  'checkout.summary.tax': 'Tax',
  'checkout.summary.free': 'Free',
  'checkout.summary.total': 'Total',
  'checkout.summary.totalPending': 'Confirmed at payment',
  'checkout.address.shippingTo': 'Shipping to',

  // ---------- errors from placing the order ----------
  'checkout.error.cartChanged':
    'Something in your cart changed while you were checking out (an item sold out or a price moved). We refreshed your order summary, so please look it over and continue.',
  'checkout.error.paymentProvider':
    'Our payment provider is having trouble right now. You have not been charged; please try again in a moment.',

  // ---------- confirmation ----------
  'checkout.confirmation.seoTitle': 'Order confirmation',
  'checkout.confirmation.order': 'Order',
  'checkout.confirmation.pending.title': 'Confirming your payment…',
  'checkout.confirmation.pending.body':
    'This usually takes a few seconds. Please keep this page open.',
  'checkout.confirmation.paid.title': 'Thank you, your order is paid!',
  'checkout.confirmation.paid.body': 'A confirmation is on its way to your email.',
  'checkout.confirmation.timeout.title': 'We are still confirming your payment',
  'checkout.confirmation.timeout.body':
    'It is taking longer than usual, which can happen when the payment provider is slow to tell us. Please do not pay again. You do not need to wait here: you will get an email as soon as the payment is confirmed, and you can come back to this page to check.',
  'checkout.confirmation.failed.title': 'Your payment did not go through',
  'checkout.confirmation.failed.body':
    'You have not been charged. Your cart is still there, so you can try again.',
  'checkout.confirmation.cancelled.title': 'This order was cancelled',
  'checkout.confirmation.cancelled.body': 'If you paid, the money is on its way back to you.',
  'checkout.confirmation.notFound.title': 'We cannot find that order here',
  'checkout.confirmation.notFound.body':
    'Orders can only be opened from the browser or account that placed them.',
  'checkout.confirmation.error.title': 'We could not check your order',
  'checkout.confirmation.error.body': 'The server did not answer. Your payment is not affected.',
  'checkout.confirmation.waking':
    'Our server is waking up after a nap, so the first answer can take up to a minute. Hang tight, your order is safe.',
  'checkout.confirmation.tryAgain': 'Try again',
  'checkout.confirmation.checkAgain': 'Check again',
  'checkout.confirmation.continueShopping': 'Continue shopping',
  'checkout.confirmation.yourOrder': 'Your order',
  'checkout.confirmation.delivery': 'Delivery',
  'checkout.confirmation.shippingMethod': 'Shipping method',
  'checkout.confirmation.contact': 'Contact',

  // ---------- messages from outside (Zod rules in @store/shared) ----------
  'msg.checkout.required': 'Required',
  'msg.checkout.emailInvalid': 'Invalid email address',
  'msg.checkout.vetName': "Enter the vet's name",
  'msg.checkout.vetClinic': 'Enter the clinic',
  'msg.checkout.countryUnsupported': 'We do not ship to this country',
} satisfies Dictionary;
