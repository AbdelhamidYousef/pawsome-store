import type { Dictionary } from '../types';

export const cart = {
  // ---------- page ----------
  'cart.title': 'Your cart',
  'cart.loading': 'Loading your cart',
  'cart.loadError': 'We could not load your cart.',
  'cart.tryAgain': 'Try again',
  'cart.empty.page': 'Your cart is empty. Time to find something waggy!',
  'cart.empty.drawer': 'Your cart is empty.',
  'cart.continueShopping': 'Continue shopping',
  'cart.summary.aria': 'Order summary',
  'cart.items.aria': 'Items in your cart',

  // ---------- drawer ----------
  'cart.drawer.loadErrorRetry': 'We could not load your cart. Try again',
  'cart.drawer.viewCart': 'View cart',
  'cart.mightNeed.title': 'You might also need',
  'cart.mightNeed.add': 'Add',
  'cart.mightNeed.addAria': 'Add {name}',

  // ---------- lines ----------
  'cart.line.each': '{price} each',
  'cart.line.eachSr': 'each',
  'cart.line.memberPrice': 'Member price',
  'cart.line.soldOut': 'Sold out',
  'cart.line.soldOutNote': 'Not included in your total. Remove it to check out.',
  'cart.line.maxAvailable': 'Maximum available',
  'cart.line.remove': 'Remove',
  'cart.line.removeAria': 'Remove {name}',
  'cart.line.ok': 'OK',
  'cart.line.okDismiss': ', dismiss notice about {name}',
  'cart.gift.label': 'Free gift',

  // ---------- notices ----------
  'cart.notice.dismiss': 'Dismiss',
  'cart.notice.dismissAbout': 'notice about {name}',
  'cart.notice.qtyReducedNoDetail': 'Not enough stock, so we lowered the quantity.',
  'cart.notice.qtyReduced': 'Only {quantity} available, so we lowered the quantity.',
  'cart.notice.qtyReducedFrom':
    'Only {quantity} available, so we lowered the quantity from {previous}.',
  'cart.notice.priceChanged': 'The price changed from {from} to {to}.',
  'cart.notice.priceChangedNoDetail': 'The price of this item changed.',
  'cart.notice.unavailable':
    '{product} ({variant}) is no longer available and was removed from your cart.',
  'cart.notice.changed': 'Something changed for {product} ({variant}).',

  // ---------- summary ----------
  'cart.summary.subtotal': 'Subtotal',
  'cart.summary.discountsApplied': 'Discounts applied',
  'cart.summary.freeDelivery': 'Free delivery',
  'cart.summary.shippingEstimate': 'Shipping (estimate, standard delivery)',
  'cart.summary.free': 'Free',
  'cart.summary.estimatedTotal': 'Estimated total',
  'cart.summary.noTax': 'Prices include VAT where it applies.',
  'cart.summary.checkout': 'Proceed to checkout',
  'cart.summary.soldOutBlock': 'Remove the sold-out items to continue.',

  // ---------- progress bars ----------
  'cart.progress.giftLabel': 'Progress to a free gift',
  'cart.progress.giftReached': 'You get a free gift!',
  'cart.progress.giftRemaining': 'Spend {amount} more for a free gift',
  'cart.progress.shippingLabel': 'Progress to free shipping',
  'cart.progress.shippingReached': 'You get free standard shipping.',
  'cart.progress.shippingRemaining': 'Add {amount} more for free standard shipping.',

  // ---------- discount code ----------
  'cart.code.label': 'Discount code',
  'cart.code.apply': 'Apply',
  'cart.code.remove': 'Remove',
  'cart.code.removeAria': 'Remove code {code}',
  'cart.code.invalid': 'Enter a valid code',
  'cart.code.fallbackName': 'your code',

  // ---------- promotion sentences ----------
  'cart.promo.unknown': 'We could not find the code {code}.',
  'cart.promo.usedUp': '{code} has been used up.',
  'cart.promo.alreadyUsed': 'You have already used {code}.',
  'cart.promo.notStarted': '{code} is not active yet.',
  'cart.promo.expired': '{code} has expired.',
  'cart.promo.minSpend': 'Add {amount} more to use {code}.',
  'cart.promo.noEligibleItems': '{code} does not apply to anything in your cart right now.',
  'cart.promo.firstOrderOnly': '{code} is for first orders only.',
  'cart.promo.notStackable': 'Your {tier} saves more than {code}, so we used that.',
  'cart.promo.bulkFallback': 'bulk discount',
  'cart.promo.creditCapped':
    'Your credit was capped so you still pay at least 0.50 (the card minimum).',

  // ---------- how discounts combine ----------
  'cart.rules.title': 'How discounts combine',
  'cart.rules.bestPrice':
    'Each item uses its best single price: regular, sale or member price. Prices never stack with each other.',
  'cart.rules.orderDiscount':
    'Then one order discount: a bulk discount or a code, whichever saves you more. Never both. Codes can exclude items already on sale.',
  'cart.rules.gift':
    'A free gift is added once your items, after that discount, reach the gift threshold.',
  'cart.rules.delivery':
    'Delivery is free over the delivery threshold or with a free-delivery code. Free-delivery codes work together with everything else.',
  'cart.rules.credits':
    'Credits come last. They never pay for delivery, and your total never goes below zero.',

  // ---------- toasts and errors ----------
  'cart.toast.removed': 'Removed {name} from your cart',
  'cart.toast.added': 'Added {quantity} x {name} to your cart',
  'cart.toast.addedMany': {
    one: 'Added {count} item to your cart',
    other: 'Added {count} items to your cart',
  },
  'cart.toast.viewCart': 'View cart',
  'cart.error.soldOut': 'Sorry, this item has just sold out.',
  'cart.error.haveAll': 'You already have all {max} we can offer in your cart.',
  'cart.error.only': 'Only {max} available.',
  'cart.error.onlyWithCart': 'Only {max} available, and you have {inCart} in your cart.',

  // ---------- messages from outside (Zod rules in @store/shared) ----------
  'msg.cart.codeRequired': 'Enter a code',
  'msg.cart.codeChars': 'Codes are letters and numbers only',
} satisfies Dictionary;
