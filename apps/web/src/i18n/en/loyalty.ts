import type { Dictionary } from '../types';

export const loyalty = {
  // Checkout: pay with points
  'loyalty.redeem.title': 'Use loyalty points',
  'loyalty.redeem.balance': 'You have {balance} points (worth {worth}).',
  'loyalty.redeem.rate': '100 points = {amount} off your items.',
  'loyalty.redeem.minimum': 'You always pay at least {amount} by card.',
  'loyalty.redeem.useMax': 'Use max ({max})',
  'loyalty.redeem.clear': 'Clear',
  'loyalty.redeem.applied': '{points} points = {amount} off',

  // Earn points (product page, cart)
  'loyalty.earn.signInLink': 'Sign in to earn',
  'loyalty.earn.signInRest': 'loyalty points on this order.',
  'loyalty.earn.points': { one: 'Earn {count} point', other: 'Earn {count} points' },

  // Footer note and charity page
  'loyalty.charityNote.text':
    '(a pretend shelter) has received {amount} so far. Demo only: no money moves.',
  'loyalty.charity.seoTitle': 'Our shelter',
  'loyalty.charity.seoDescription':
    'Whisker Hollow Rescue, the (fictional) shelter Pawsome supports. A demo: no money moves.',
  'loyalty.charity.note':
    'This is a demo store and the shelter is made up. Donations here are counted, but no money moves anywhere.',
  'loyalty.charity.error': 'We could not load the total just now.',
  'loyalty.charity.given': 'Given so far',
  'loyalty.charity.donations': { one: 'from {count} donation', other: 'from {count} donations' },
  'loyalty.charity.waysTitle': 'Two ways to give',
  'loyalty.charity.checkoutLabel': 'At checkout:',
  'loyalty.charity.checkoutText':
    'tick “round up” and the total goes up to the next whole euro. The extra is its own line on your order, never discounted.',
  'loyalty.charity.pointsLabel': 'With points:',
  'loyalty.charity.pointsText': 'give any number of your loyalty points (1 point = 1 cent)',
  'loyalty.charity.pointsOnYour': 'on your',
  'loyalty.charity.rewardsPage': 'rewards page',
  'loyalty.charity.pointsOnceYou': 'once you',
  'loyalty.charity.signIn': 'sign in',
  'loyalty.charity.roundUpNote':
    'A round-up is counted when the order is paid and taken back if the order is refunded.',

  // Referral panel
  'loyalty.referral.title': 'Refer a friend',
  'loyalty.referral.how':
    'Share your link. When a friend makes an account and pays for their first order of {min} or more, you both get a {reward} code (valid {days} days, for an order of {min} or more).',
  'loyalty.referral.copy': 'Copy link',
  'loyalty.referral.copied': 'Copied',
  'loyalty.referral.linkCopied': 'Link copied',
  'loyalty.referral.stats':
    '{qualified} rewarded, {pending} waiting for a first order. Up to {max} a year.',
  'loyalty.referral.statsRejected':
    '{qualified} rewarded, {pending} waiting for a first order, {rejected} not eligible. Up to {max} a year.',

  // /account/rewards
  'loyalty.rewards.title': 'Rewards',
  'loyalty.rewards.pointsError': 'We could not load your points.',
  'loyalty.rewards.retry': 'Try again',
  'loyalty.rewards.balance': 'Your balance',
  'loyalty.rewards.pointsUnit': 'points',
  'loyalty.rewards.worth': 'Worth {amount} at checkout',
  'loyalty.rewards.earnRateOne': 'You earn 1 point per euro spent.',
  'loyalty.rewards.earnRatePercent': 'You earn {percent}% per euro spent.',
  'loyalty.rewards.nextTier': '{points} more earned points to reach {label}.',
  'loyalty.rewards.topTier': 'You are at the top tier. Good dog!',
  'loyalty.rewards.spendTitle': 'Spend your points',
  'loyalty.rewards.rewardsError': 'We could not load the rewards.',
  'loyalty.rewards.noRewards': 'No rewards are available right now.',
  'loyalty.rewards.cost': '{points} points',
  'loyalty.rewards.redeem.button': 'Redeem',
  'loyalty.rewards.redeem.morePoints': '{short} more points',
  'loyalty.rewards.redeem.for': 'for {name}',
  'loyalty.rewards.redeem.code': 'Your code is {code}',
  'loyalty.rewards.redeem.failed': 'We could not redeem that.',
  'loyalty.rewards.giveAwayTitle': 'Or give them away',
  'loyalty.rewards.donate.giveTo': 'Give points to',
  'loyalty.rewards.donate.aboutShelter':
    ', a pretend shelter (1 point = 1 cent; demo only, no money moves).',
  'loyalty.rewards.donate.label': 'Points to donate',
  'loyalty.rewards.donate.button': 'Donate',
  'loyalty.rewards.donate.thanks': 'Thank you! {points} points went to the shelter.',
  'loyalty.rewards.donate.failed': 'We could not donate that.',
  'loyalty.rewards.codesTitle': 'Your codes',
  'loyalty.rewards.codesEmpty': 'Codes you buy with points appear here. Apply one in your cart.',
  'loyalty.rewards.code.freeDelivery': 'Free delivery',
  'loyalty.rewards.code.fixedOff': '{amount} off',
  'loyalty.rewards.code.percentOff': '{percent}% off',
  'loyalty.rewards.code.minSpend': ', min spend {amount}',
  'loyalty.rewards.code.used': 'Used',
  'loyalty.rewards.code.validUntil': 'Valid until {date}',
  'loyalty.rewards.code.noExpiry': 'No expiry',
  'loyalty.rewards.historyTitle': 'Points history',
  'loyalty.rewards.historyEmpty': 'No points yet. Every euro you spend on an order earns points.',
  'loyalty.rewards.historyCaption': 'Your last 50 points movements',
  'loyalty.rewards.colDate': 'Date',
  'loyalty.rewards.colWhat': 'What',
  'loyalty.rewards.colPoints': 'Points',
  'loyalty.rewards.kind.earn': 'Earned',
  'loyalty.rewards.kind.redeem': 'Spent',
  'loyalty.rewards.kind.reversal': 'Returned or taken back',
  'loyalty.rewards.kind.bonus': 'Bonus',
  'loyalty.rewards.kind.donate': 'Donated',
  'loyalty.rewards.kind.adjust': 'Adjustment',

  // Wishlist
  'loyalty.wishlist.title': 'Your wishlist',
  'loyalty.wishlist.saveLabel': 'Save {name} to wishlist',
  'loyalty.wishlist.saved': 'Saved {name} to your wishlist',
  'loyalty.wishlist.updateFailed': 'We could not update your wishlist. Please try again.',
  'loyalty.wishlist.moveToCart': 'Move to cart',
  'loyalty.wishlist.soldOut': 'Sold out',
  'loyalty.wishlist.remove': 'Remove',
  'loyalty.wishlist.error': 'We could not load your wishlist just now.',
  'loyalty.wishlist.empty': 'Nothing saved yet. Tap the heart on a product to keep it here.',
  'loyalty.wishlist.keepBrowsing': 'Keep browsing',
  'loyalty.wishlist.shareTitle': 'Share your wishlist',
  'loyalty.wishlist.shareText':
    'Anyone with the link can see these items and your first name, nothing else. Turn it off and the link stops working.',
  'loyalty.wishlist.stopSharing': 'Stop sharing',
  'loyalty.wishlist.createLink': 'Create a share link',
  'loyalty.wishlist.signIn': 'Sign in',
  'loyalty.wishlist.signInRest': 'to share your list. Your saved items come with you.',
  'loyalty.wishlist.sharedTitle': 'A shared wishlist',
  'loyalty.wishlist.ownerTitle': '{name}’s wishlist',
  'loyalty.wishlist.sharedEmpty': 'Nothing on this list right now.',

  // Newsletter
  'loyalty.newsletter.seoTitle': 'Newsletter',
  'loyalty.newsletter.seoDescription': 'Pet tips and offers from Pawsome.',
  'loyalty.newsletter.pageTitle': 'Join the pack',
  'loyalty.newsletter.pageText':
    'Subscribe and get 10% off your first order once you confirm your address.',
  'loyalty.newsletter.slotTitle': 'Join the pack: 10% off your first order',
  'loyalty.newsletter.slotText':
    'Tips for your pets and the odd offer. We email a link to confirm first, and every message has a one-click unsubscribe. See the',
  'loyalty.newsletter.privacyLink': 'privacy policy',
  'loyalty.newsletter.email': 'Email',
  'loyalty.newsletter.pets': 'Which pets do you have?',
  'loyalty.newsletter.consent':
    'Send me Pawsome news, offers and tips for my pets. I can unsubscribe with one click at any time.',
  'loyalty.newsletter.consentRequired': 'Please tick the box to subscribe',
  'loyalty.newsletter.honeypot': 'Leave this empty',
  'loyalty.newsletter.submit': 'Subscribe and get 10% off',
  'loyalty.newsletter.done':
    'Almost there! If this address can receive our emails, a confirmation link is on its way. Click it and your welcome code follows.',
  'loyalty.newsletter.tooMany': 'Too many sign-ups from here. Please try again later.',
  'loyalty.newsletter.failed': 'We could not sign you up right now. Please try again in a moment.',
  'loyalty.newsletter.token.incomplete':
    'This link is incomplete. Please open it again from the email.',
  'loyalty.newsletter.token.working': 'Working on it',
  'loyalty.newsletter.token.expired': 'This link has expired.',
  'loyalty.newsletter.token.invalid': 'This link is not valid any more.',
  'loyalty.newsletter.token.signUpAgain': 'Sign up again',
  'loyalty.newsletter.confirm.title': 'Confirm your subscription',
  'loyalty.newsletter.confirm.already':
    'You are already subscribed. Your welcome code is in the email we sent.',
  'loyalty.newsletter.confirm.done':
    'You are subscribed! We just emailed you your 10% welcome code.',
  'loyalty.newsletter.unsubscribe.title': 'Unsubscribe',
  'loyalty.newsletter.unsubscribe.done': 'You are unsubscribed. We will not send you more news.',

  // Stock alerts
  'loyalty.stockAlerts.title': 'Email me when it is back',
  'loyalty.stockAlerts.email': 'Email',
  'loyalty.stockAlerts.submit': 'Email me when back',
  'loyalty.stockAlerts.done': 'Got it. We will email {email} once, when it is back.',
  'loyalty.stockAlerts.inStock': 'It is in stock right now: refresh the page.',
  'loyalty.stockAlerts.limit': 'You can wait for at most 5 items at a time.',
  'loyalty.stockAlerts.tooMany': 'Too many requests. Please try again later.',
  'loyalty.stockAlerts.failed': 'We could not save that. Please try again.',
  'loyalty.stockAlerts.cancel.title': 'Stock alert',
  'loyalty.stockAlerts.cancel.done': 'Done: we will not email you about that item.',

  // Messages from outside (shared Zod rules)
  'msg.loyalty.emailInvalid': 'Enter a valid email address',
  'loyalty.newsletter.perkTips': 'Care tips for the pets you pick',
  'loyalty.newsletter.perkNew': 'First word on new toys and treats',
  'loyalty.newsletter.perkEasy': 'One-click unsubscribe, any time',
} satisfies Dictionary;
