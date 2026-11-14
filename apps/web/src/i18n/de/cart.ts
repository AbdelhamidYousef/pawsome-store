import type { cart as enNs } from '../en/cart';
import type { Entry } from '../types';

export const cart: Record<keyof typeof enNs, Entry> = {
  // ---------- page ----------
  'cart.title': 'Ihr Warenkorb',
  'cart.loading': 'Ihr Warenkorb wird geladen',
  'cart.loadError': 'Wir konnten Ihren Warenkorb nicht laden.',
  'cart.tryAgain': 'Erneut versuchen',
  'cart.empty.page': 'Ihr Warenkorb ist leer. Zeit für etwas, das Schwänze wedeln lässt!',
  'cart.empty.drawer': 'Ihr Warenkorb ist leer.',
  'cart.continueShopping': 'Weiter einkaufen',
  'cart.summary.aria': 'Bestellübersicht',
  'cart.items.aria': 'Artikel in Ihrem Warenkorb',

  // ---------- drawer ----------
  'cart.drawer.loadErrorRetry': 'Wir konnten Ihren Warenkorb nicht laden. Erneut versuchen',
  'cart.drawer.viewCart': 'Warenkorb ansehen',
  'cart.mightNeed.title': 'Das könnten Sie auch brauchen',
  'cart.mightNeed.add': 'Hinzufügen',
  'cart.mightNeed.addAria': '{name} hinzufügen',

  // ---------- lines ----------
  'cart.line.each': '{price} pro Stück',
  'cart.line.eachSr': 'pro Stück',
  'cart.line.memberPrice': 'Mitgliedspreis',
  'cart.line.soldOut': 'Ausverkauft',
  'cart.line.soldOutNote':
    'Nicht in Ihrer Summe enthalten. Entfernen Sie den Artikel, um zur Kasse zu gehen.',
  'cart.line.maxAvailable': 'Maximal verfügbar',
  'cart.line.remove': 'Entfernen',
  'cart.line.removeAria': '{name} entfernen',
  'cart.line.ok': 'OK',
  'cart.line.okDismiss': ', Hinweis zu {name} schließen',
  'cart.gift.label': 'Gratisgeschenk',

  // ---------- notices ----------
  'cart.notice.dismiss': 'Schließen',
  'cart.notice.dismissAbout': 'Hinweis zu {name}',
  'cart.notice.qtyReducedNoDetail': 'Nicht genug Bestand, daher haben wir die Menge verringert.',
  'cart.notice.qtyReduced': 'Nur {quantity} verfügbar, daher haben wir die Menge verringert.',
  'cart.notice.qtyReducedFrom':
    'Nur {quantity} verfügbar, daher haben wir die Menge von {previous} verringert.',
  'cart.notice.priceChanged': 'Der Preis hat sich von {from} auf {to} geändert.',
  'cart.notice.priceChangedNoDetail': 'Der Preis dieses Artikels hat sich geändert.',
  'cart.notice.unavailable':
    '{product} ({variant}) ist nicht mehr verfügbar und wurde aus Ihrem Warenkorb entfernt.',
  'cart.notice.changed': 'Bei {product} ({variant}) hat sich etwas geändert.',

  // ---------- summary ----------
  'cart.summary.subtotal': 'Zwischensumme',
  'cart.summary.discountsApplied': 'Angewendete Rabatte',
  'cart.summary.freeDelivery': 'Kostenlose Lieferung',
  'cart.summary.shippingEstimate': 'Versand (Schätzung, Standardlieferung)',
  'cart.summary.free': 'Kostenlos',
  'cart.summary.estimatedTotal': 'Voraussichtlicher Gesamtbetrag',
  'cart.summary.noTax': 'Preise inkl. MwSt., sofern anwendbar.',
  'cart.summary.checkout': 'Zur Kasse',
  'cart.summary.soldOutBlock': 'Entfernen Sie die ausverkauften Artikel, um fortzufahren.',

  // ---------- progress bars ----------
  'cart.progress.giftLabel': 'Fortschritt zum Gratisgeschenk',
  'cart.progress.giftReached': 'Sie erhalten ein Gratisgeschenk!',
  'cart.progress.giftRemaining': 'Noch {amount} bis zum Gratisgeschenk',
  'cart.progress.shippingLabel': 'Fortschritt zum kostenlosen Versand',
  'cart.progress.shippingReached': 'Sie erhalten kostenlosen Standardversand.',
  'cart.progress.shippingRemaining': 'Noch {amount} bis zum kostenlosen Standardversand.',

  // ---------- discount code ----------
  'cart.code.label': 'Rabattcode',
  'cart.code.apply': 'Einlösen',
  'cart.code.remove': 'Entfernen',
  'cart.code.removeAria': 'Code {code} entfernen',
  'cart.code.invalid': 'Geben Sie einen gültigen Code ein',
  'cart.code.fallbackName': 'Ihr Code',

  // ---------- promotion sentences ----------
  'cart.promo.unknown': 'Den Code {code} haben wir nicht gefunden.',
  'cart.promo.usedUp': '{code} wurde bereits vollständig eingelöst.',
  'cart.promo.alreadyUsed': 'Sie haben {code} bereits verwendet.',
  'cart.promo.notStarted': '{code} ist noch nicht aktiv.',
  'cart.promo.expired': '{code} ist abgelaufen.',
  'cart.promo.minSpend': 'Fügen Sie noch {amount} hinzu, um {code} zu nutzen.',
  'cart.promo.noEligibleItems': '{code} gilt derzeit für keinen Artikel in Ihrem Warenkorb.',
  'cart.promo.firstOrderOnly': '{code} gilt nur für Erstbestellungen.',
  'cart.promo.notStackable': 'Ihr {tier} spart mehr als {code}, daher haben wir diesen verwendet.',
  'cart.promo.bulkFallback': 'Mengenrabatt',
  'cart.promo.creditCapped':
    'Ihr Guthaben wurde begrenzt, damit Sie weiterhin mindestens 0,50 zahlen (das Kartenminimum).',

  // ---------- how discounts combine ----------
  'cart.rules.title': 'So lassen sich Rabatte kombinieren',
  'cart.rules.bestPrice':
    'Jeder Artikel erhält seinen besten Einzelpreis: Normalpreis, Angebotspreis oder Mitgliedspreis. Preise werden nie miteinander kombiniert.',
  'cart.rules.orderDiscount':
    'Dann folgt ein Bestellrabatt: ein Mengenrabatt oder ein Code, je nachdem, was mehr spart. Nie beides. Codes können Artikel im Angebot ausschließen.',
  'cart.rules.gift':
    'Ein Gratisgeschenk kommt dazu, sobald Ihre Artikel nach diesem Rabatt den Mindestwert für das Geschenk erreichen.',
  'cart.rules.delivery':
    'Ab dem Mindestbestellwert für Gratisversand oder mit einem Gratisversand-Code ist die Lieferung kostenlos. Gratisversand-Codes lassen sich mit allem anderen kombinieren.',
  'cart.rules.credits':
    'Guthaben wird zuletzt angerechnet. Es gilt nie für die Versandkosten, und Ihre Summe fällt nie unter null.',

  // ---------- toasts and errors ----------
  'cart.toast.removed': '{name} wurde aus Ihrem Warenkorb entfernt',
  'cart.toast.added': '{quantity} x {name} zu Ihrem Warenkorb hinzugefügt',
  'cart.toast.addedMany': {
    one: '{count} Artikel zu Ihrem Warenkorb hinzugefügt',
    other: '{count} Artikel zu Ihrem Warenkorb hinzugefügt',
  },
  'cart.toast.viewCart': 'Warenkorb ansehen',
  'cart.error.soldOut': 'Leider ist dieser Artikel gerade ausverkauft.',
  'cart.error.haveAll': 'Sie haben bereits alle {max} in Ihrem Warenkorb, die wir anbieten können.',
  'cart.error.only': 'Nur {max} verfügbar.',
  'cart.error.onlyWithCart': 'Nur {max} verfügbar, und Sie haben {inCart} in Ihrem Warenkorb.',

  // ---------- messages from outside (Zod rules in @store/shared) ----------
  'msg.cart.codeRequired': 'Geben Sie einen Code ein',
  'msg.cart.codeChars': 'Codes bestehen nur aus Buchstaben und Zahlen',
};
