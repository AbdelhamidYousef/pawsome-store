import type { TextEntry } from '@store/shared';

// English email strings: the source the other languages are typed from (a key missing in de.ts or
// fr.ts fails the typecheck) and the fallback for any language. `{name}` marks a value filled in
// at send time; there is no markup in a string (the template wraps what must be bold or a link).
// Names, notes, admin text and catalogue text are data, not strings here: they are never
// translated by this file.
export const en = {
  // ----- shared -----
  'mail.footer':
    'Thanks for shopping with Pawsome. Payments run in Stripe test mode: no card was charged.',
  'mail.signoff': '- The Pawsome team',
  'mail.hello': 'Hello {name},',
  'mail.seeOrder': 'See your order',
  'mail.orderLine': 'Order: {url}',

  // ----- order summary (confirmation, shipped) -----
  'order.qty': 'qty {quantity}',
  'order.subtotal': 'Subtotal',
  'order.shipping': 'Shipping ({method})',
  'order.discount': 'Discount',
  'order.donation': 'Donation to Whisker Hollow Rescue',
  'order.total': 'Total',
  'order.shippingTo': 'Shipping to:',
  'order.deliveringTo': 'Delivering to:',

  // ----- order confirmation -----
  'confirm.subject': 'Your Pawsome order {number} is confirmed',
  'confirm.thanks': 'Thank you for your order, {name}!',
  'confirm.paid': 'Order {number} is paid and we are getting it ready.',
  'confirm.willEmail': "We'll email you again when it ships.",
  'confirm.follow': 'Follow your order any time: {url}',
  'confirm.preheader': 'Order {number} is confirmed.',
  'confirm.heading': 'Thank you for your order!',
  'confirm.intro': 'Hi {name}, order {number} is paid and we are getting it ready.',
  'confirm.track': 'Track your order',
  'confirm.trackNote': '(you will need the email address you ordered with).',

  // ----- order shipped -----
  'shipped.subject': 'Your Pawsome order {number} is on its way',
  'shipped.good': 'Good news, {name}: order {number} has shipped!',
  'shipped.method': 'Shipping method: {method}',
  'shipped.preheader': 'Order {number} has shipped.',
  'shipped.heading': 'Your order is on its way!',
  'shipped.intro': 'Hi {name}, order {number} has shipped with {method} shipping.',

  // ----- withdrawal -----
  'withdrawal.subject': 'We received your withdrawal for order {number}',
  'withdrawal.body':
    'This email confirms that on {when} we received your statement withdrawing from the contract for order {number}.',
  'withdrawal.reference': 'Reference: {reference}',
  'withdrawal.covers': 'Covers: {scope}',
  'withdrawal.wholeOrder': 'the whole order',
  'withdrawal.reason': 'Reason you gave: {reason}',
  'withdrawal.next': 'We will write again with the next steps. Keep this email as your proof.',
  'withdrawal.preheader': 'Withdrawal for order {number} received.',
  'withdrawal.heading': 'We received your withdrawal',

  // ----- returns -----
  'return.requested.subject': 'We got your return request for order {order}',
  'return.requested.heading': 'We got your return request',
  'return.requested.l1':
    'Thanks, we have your request ({ref}) for order {order}. Someone will look at it soon and email you the next step.',
  'return.requested.l2': 'You asked to return: {list}.',
  'return.approved.subject': 'Your return {ref} is approved',
  'return.approved.heading': 'Your return is approved',
  'return.approved.l1': 'Good news: your return {ref} for order {order} is approved.',
  'return.approved.l2':
    'How to send it back: pack {list} in the original packaging if you can, write {ref} on the parcel, and post it to Pawsome Returns, 1 Bone Street, Riga LV-1010.',
  'return.approved.l3':
    'When it arrives and we have checked it, we refund you and send another email.',
  'return.rejected.subject': 'About your return {ref}',
  'return.rejected.heading': 'We could not accept this return',
  'return.rejected.l1': 'We are sorry: we could not accept return {ref} for order {order}.',
  'return.rejected.reason': 'Reason: {reason}',
  'return.rejected.noReason': 'Write to us if you would like to know more.',
  'return.received.subject': 'We received your return {ref}',
  'return.received.heading': 'Your parcel arrived',
  'return.received.l1': 'Your return {ref} for order {order} has arrived: {list}.',
  'return.received.l2':
    'We are preparing your refund of {money}. You will get one more email when it is sent.',
  'return.refunded.subject': 'Your refund of {money} is on its way',
  'return.refunded.heading': 'Your refund is on its way',
  'return.refunded.l1': 'We refunded {money} for return {ref} (order {order}).',
  'return.refunded.simulated': 'The refund goes back to the card you paid with.',
  'return.refunded.real':
    'It usually shows up on your card within a few days, depending on your bank.',

  // ----- vet check -----
  'vet.held.subject': "Order {number} is waiting for a vet's okay",
  'vet.held.heading': "Your order is waiting for a vet's okay",
  'vet.held.l1':
    "Thank you! Order {number} includes an item that needs a vet's approval, so we are holding it until that is decided. Your payment is safe and the items are set aside for you.",
  'vet.held.l2':
    'We will email you as soon as there is an answer. Most requests are decided within one working day.',
  'vet.approved.subject': 'Order {number} is approved and being packed',
  'vet.approved.heading': 'Approved, we are packing it',
  'vet.approved.l1':
    'Good news: the vet check for order {number} is done and your order is now being packed.',
  'vet.rejected.subject': 'Order {number} was not approved',
  'vet.rejected.heading': 'We could not approve this order',
  'vet.rejected.l1':
    'We are sorry: the vet check for order {number} was not approved, so the order is cancelled and your payment is refunded in full.',
  'vet.rejected.reason': 'Reason: {reason}',
  'vet.rejected.simulated': 'The refund goes back to the card you paid with.',
  'vet.rejected.real': 'The refund usually shows up on your card within a few days.',

  // ----- newsletter -----
  'news.unsub.text':
    'You get this because you subscribed to Pawsome news. Unsubscribe with one click: {url}',
  'news.unsub.lead': 'You get this because you subscribed to Pawsome news.',
  'news.unsub.link': 'Unsubscribe with one click',
  'news.confirm.subject': 'Confirm your Pawsome subscription',
  'news.confirm.l1':
    'One more step: please confirm that you want Pawsome news, offers and pet tips.',
  'news.confirm.link': 'Confirm: {url}',
  'news.confirm.button': 'Yes, subscribe me',
  'news.confirm.hours': {
    one: 'The link works for {count} hour. If you did not ask for this, ignore this email and nothing will be sent to you.',
    other:
      'The link works for {count} hours. If you did not ask for this, ignore this email and nothing will be sent to you.',
  },
  'news.confirm.preheader': 'Confirm your address to get your welcome code',
  'news.confirm.heading': 'Confirm your subscription',
  'news.welcome.subject': 'Welcome to Pawsome: {percent}% off your first order',
  'news.welcome.l1': 'You are in. Thank you for subscribing!',
  'news.welcome.code': 'Your welcome code: {code}',
  'news.welcome.terms': {
    one: '{percent}% off your first order, one use, valid for {count} day.',
    other: '{percent}% off your first order, one use, valid for {count} days.',
  },
  'news.welcome.enter': 'Enter it in the cart.',
  'news.welcome.preheader': 'Your {percent}% welcome code is inside',
  'news.welcome.heading': 'Welcome to the pack',

  // ----- stock alert -----
  'stock.subject': 'Back in stock: {product}',
  'stock.l1': 'Good news: {product} ({variant}) is back in stock.',
  'stock.look': 'Take a look: {url}',
  'stock.button': 'See it in the shop',
  'stock.hurry': 'Stock can go quickly, so we cannot hold one for you.',
  'stock.once': 'You asked us for this one email.',
  'stock.cancel': 'Not interested any more?',
  'stock.preheader': '{product} is back',
  'stock.heading': 'It is back in stock',

  // ----- pet messages -----
  'pet.birthday.subject': 'Happy birthday, {pet}!',
  'pet.birthday.heading': 'Happy birthday, {pet}!',
  'pet.birthday.treat': 'A treat from us: {percent}% off, just for you.',
  'pet.birthday.code': 'Code: {code}',
  'pet.birthday.terms': {
    one: 'One use, valid for {count} day, and only on your account.',
    other: 'One use, valid for {count} days, and only on your account.',
  },
  'pet.birthday.shop': 'Shop: {url}',
  'pet.birthday.button': 'Pick a birthday present',
  'pet.birthday.preheader': "{percent}% off for {pet}'s birthday",
  'pet.stage.subject': '{pet} is {age} old: time to look at food?',
  'pet.stage.today': '{pet} is {age} old today.',
  'pet.stage.heading': '{pet} is {age} old',
  'pet.stage.dog':
    'A growing puppy needs different food as it gets older. It may be time to switch, and your vet can tell you when.',
  'pet.stage.cat':
    'A growing kitten needs different food as it gets older. It may be time to switch, and your vet can tell you when.',
  'pet.stage.see': 'See what we have: {url}',
  'pet.stage.button': 'Browse food',
  'pet.stage.preheader.dog': 'Growing puppies change what they eat',
  'pet.stage.preheader.cat': 'Growing kittens change what they eat',
  'pet.age.life_stage_8w': '8 weeks',
  'pet.age.life_stage_6m': '6 months',
  'pet.age.life_stage_12m': '12 months',

  // ----- contact -----
  'contact.topic.order': 'My order',
  'contact.topic.shipping': 'Shipping and delivery',
  'contact.topic.returns': 'Returns and refunds',
  'contact.topic.product': 'A product',
  'contact.topic.account': 'My account',
  'contact.topic.privacy': 'My data and privacy',
  'contact.topic.other': 'Something else',
  'contact.ack.subject': 'We got your message ({reference})',
  'contact.ack.l1':
    'Thank you for writing to Pawsome. A person will reply to this address, usually within two working days.',
  'contact.ack.reference': 'Reference: {reference}',
  'contact.ack.topic': 'Topic: {topic}',
  'contact.ack.order': 'Order: {order}',
  'contact.ack.yourMessage': 'Your message:',
  'contact.ack.preheader': 'We received your message.',
  'contact.ack.heading': 'We got your message',

  // ----- product safety notice, review approved -----
  'safety.recall': 'Product recall: {title}',
  'safety.notice': 'Product safety notice: {title}',
  'safety.reason': 'You are receiving this because you bought an affected product from Pawsome.',
  'review.subject': 'Your review of {product} is live',
  'review.l1':
    'Thank you for reviewing {product}! Your review has passed our check and is now on the product page, where it helps other pet owners choose.',
  'review.see': 'See it here: {url}',
  'review.link': 'See your review',
  'review.preheader': 'Your review of {product} is live.',
  'review.heading': 'Thank you for your review!',
} as const satisfies Record<string, TextEntry>;

export type EmailKey = keyof typeof en;
