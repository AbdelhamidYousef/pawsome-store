import type { checkout as enNs } from '../en/checkout';
import type { Entry } from '../types';

export const checkout: Record<keyof typeof enNs, Entry> = {
  // ---------- page ----------
  'checkout.title': 'Kasse',
  'checkout.backToCart': 'Zurück zum Warenkorb',
  'checkout.loading': 'Kasse wird geladen',
  'checkout.cartLoadError': 'Wir konnten Ihren Warenkorb nicht laden.',
  'checkout.tryAgain': 'Erneut versuchen',
  'checkout.empty': 'Ihr Warenkorb ist leer, daher gibt es noch nichts zu bezahlen.',
  'checkout.continueShopping': 'Weiter einkaufen',
  'checkout.soldOut':
    'Ein Artikel in Ihrem Warenkorb ist ausverkauft. Entfernen Sie ihn, um fortzufahren.',
  'checkout.reviewCart': 'Warenkorb prüfen',

  // ---------- step cards ----------
  'checkout.step.details': 'Kontakt und Adresse',
  'checkout.step.shipping': 'Versandart',
  'checkout.step.payment': 'Zahlung',
  'checkout.step.edit': 'Ändern',
  'checkout.step.editAria': '{title} ändern',
  'checkout.step.editDetails': 'Kontakt und Adresse ändern',
  'checkout.step.editShipping': 'Versandart ändern',
  'checkout.step.vetSummary': 'Tierarztpraxis: {name}, {clinic}',

  // ---------- step 1: details ----------
  'checkout.details.haveAccount': 'Sie haben ein Konto?',
  'checkout.details.signIn': 'Melden Sie sich an,',
  'checkout.details.signInRest':
    'um Ihre gespeicherten Daten zu nutzen. Oder fahren Sie einfach als Gast fort.',
  'checkout.details.email': 'E-Mail',
  'checkout.details.emailHint': 'Hierhin senden wir Ihre Bestellbestätigung.',
  'checkout.details.fullName': 'Vollständiger Name',
  'checkout.details.line1': 'Adresszeile 1',
  'checkout.details.line2': 'Adresszeile 2 (optional)',
  'checkout.details.postalCode': 'Postleitzahl',
  'checkout.details.city': 'Stadt',
  'checkout.details.region': 'Region (optional)',
  'checkout.details.country': 'Land',
  'checkout.details.countryHint': 'Wir liefern innerhalb Europas.',
  'checkout.details.phone': 'Telefon (optional)',
  'checkout.details.phoneHint': 'Nur für den Zusteller.',
  'checkout.details.saveAddress': 'Diese Adresse in meinem Konto speichern',
  'checkout.details.continue': 'Weiter zum Versand',

  // ---------- vet ----------
  'checkout.vet.bannerTitle': 'Tierärztliche Freigabe erforderlich.',
  'checkout.vet.bannerBody':
    'Nach der Zahlung halten wir diese Bestellung zurück, bis die tierärztliche Freigabe vorliegt, und verpacken sie dann. Die meisten Anfragen werden innerhalb eines Werktags freigegeben.',
  'checkout.vet.legend': 'Ihre Tierarztpraxis',
  'checkout.vet.intro':
    'Ein Artikel in Ihrem Warenkorb benötigt eine tierärztliche Freigabe, bevor wir ihn verpacken. Wir benachrichtigen Sie per E-Mail, sobald die Entscheidung gefallen ist.',
  'checkout.vet.demo': 'Die meisten Anfragen werden innerhalb eines Werktags freigegeben.',
  'checkout.vet.name': 'Name (Tierärztin/Tierarzt)',
  'checkout.vet.clinic': 'Praxis',
  'checkout.vet.email': 'E-Mail der Praxis',

  // ---------- step 2: shipping ----------
  'checkout.shipping.loading': 'Versandoptionen werden geladen',
  'checkout.shipping.loadError': 'Wir konnten die Versandoptionen nicht laden.',
  'checkout.shipping.none': 'Wir können diese Bestellung derzeit nicht in dieses Land liefern.',
  'checkout.shipping.legend': 'Versandart',
  'checkout.shipping.etaSame': {
    one: '{count} Werktag',
    other: '{count} Werktage',
  },
  'checkout.shipping.etaRange': {
    one: '{min}-{max} Werktage',
    other: '{min}-{max} Werktage',
  },
  'checkout.shipping.free': 'Kostenlos',
  'checkout.shipping.continue': 'Weiter zur Zahlung',
  'checkout.shipping.tryAgain': 'Erneut versuchen',
  'checkout.roundUp.label': 'Meine Summe für Whisker Hollow Rescue auf den nächsten Euro aufrunden',
  'checkout.roundUp.hint': 'Die zusätzlichen Cent erscheinen als eigene Zeile in Ihrer Bestellung.',

  // ---------- step 3: payment ----------
  'checkout.payment.pay': '{amount} bezahlen',
  'checkout.payment.testMode':
    'Testmodus: Verwenden Sie die Karte 4242 4242 4242 4242, ein beliebiges Ablaufdatum in der Zukunft und eine beliebige Prüfnummer (CVC). Es fließt kein echtes Geld.',
  'checkout.payment.notConfiguredTitle': 'Zahlungen sind in dieser Umgebung nicht eingerichtet',
  'checkout.payment.notConfiguredBody':
    'Kartenzahlungen sind in dieser Shop-Umgebung noch nicht freigeschaltet, daher können hier keine Bestellungen aufgegeben werden. Alles vor diesem Schritt funktioniert wie gewohnt.',
  'checkout.payment.preparing': 'Ihre Zahlung wird vorbereitet…',
  'checkout.payment.loadFailedTitle': 'Wir konnten das sichere Zahlungsformular nicht laden',
  'checkout.payment.loadFailedBody':
    'Es wurde nichts abgebucht, und Ihre Bestellung ist gespeichert. Prüfen Sie Ihre Verbindung (auch ein Werbe- oder Skript-Blocker kann das Stripe-Formular blockieren) und versuchen Sie es dann erneut.',
  'checkout.payment.tryAgain': 'Erneut versuchen',
  'checkout.payment.failed':
    'Bei der Zahlung ist etwas schiefgelaufen. Es wurde nichts abgebucht; bitte versuchen Sie es erneut.',
  'checkout.payment.unreachable':
    'Wir konnten den Zahlungsanbieter nicht erreichen. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.',

  // ---------- summary ----------
  'checkout.summary.aria': 'Bestellübersicht',
  'checkout.summary.title': 'Bestellübersicht',
  'checkout.summary.codeBack': 'Zurück zum Warenkorb, um den Code zu ändern',
  'checkout.summary.itemsRegion': 'Artikel in Ihrer Bestellung ({count}), scrollbar',
  'checkout.summary.qty': 'Menge {quantity}',
  'checkout.summary.subtotal': 'Zwischensumme',
  'checkout.summary.shipping': 'Versand',
  'checkout.summary.shippingNext': 'Nächster Schritt',
  'checkout.summary.discount': 'Rabatt',
  'checkout.summary.donation': 'Spende',
  'checkout.summary.tax': 'MwSt.',
  'checkout.summary.free': 'Kostenlos',
  'checkout.summary.total': 'Gesamtsumme',
  'checkout.summary.totalPending': 'Wird bei der Zahlung bestätigt',
  'checkout.address.shippingTo': 'Lieferung an',

  // ---------- errors from placing the order ----------
  'checkout.error.cartChanged':
    'Während Ihres Bestellvorgangs hat sich etwas in Ihrem Warenkorb geändert (ein Artikel ist ausverkauft oder ein Preis hat sich verändert). Wir haben Ihre Bestellübersicht aktualisiert; bitte prüfen Sie sie und fahren Sie fort.',
  'checkout.error.paymentProvider':
    'Unser Zahlungsanbieter hat gerade Probleme. Es wurde nichts abgebucht; bitte versuchen Sie es in einem Moment erneut.',

  // ---------- confirmation ----------
  'checkout.confirmation.seoTitle': 'Bestellbestätigung',
  'checkout.confirmation.order': 'Bestellung',
  'checkout.confirmation.pending.title': 'Ihre Zahlung wird bestätigt…',
  'checkout.confirmation.pending.body':
    'Das dauert meist nur wenige Sekunden. Bitte lassen Sie diese Seite geöffnet.',
  'checkout.confirmation.paid.title': 'Vielen Dank, Ihre Bestellung ist bezahlt!',
  'checkout.confirmation.paid.body': 'Eine Bestätigung ist per E-Mail unterwegs zu Ihnen.',
  'checkout.confirmation.timeout.title': 'Wir bestätigen Ihre Zahlung noch',
  'checkout.confirmation.timeout.body':
    'Es dauert länger als gewöhnlich. Das kann passieren, wenn der Zahlungsanbieter uns verzögert benachrichtigt. Bitte zahlen Sie nicht erneut. Sie müssen hier nicht warten: Sobald die Zahlung bestätigt ist, erhalten Sie eine E-Mail, und Sie können jederzeit auf diese Seite zurückkehren, um nachzusehen.',
  'checkout.confirmation.failed.title': 'Ihre Zahlung war nicht erfolgreich',
  'checkout.confirmation.failed.body':
    'Es wurde nichts abgebucht. Ihr Warenkorb ist noch da, Sie können es also erneut versuchen.',
  'checkout.confirmation.cancelled.title': 'Diese Bestellung wurde storniert',
  'checkout.confirmation.cancelled.body':
    'Falls Sie bezahlt haben, ist das Geld auf dem Weg zurück zu Ihnen.',
  'checkout.confirmation.notFound.title': 'Wir finden diese Bestellung hier nicht',
  'checkout.confirmation.notFound.body':
    'Bestellungen lassen sich nur über den Browser oder das Konto öffnen, mit dem sie aufgegeben wurden.',
  'checkout.confirmation.error.title': 'Wir konnten Ihre Bestellung nicht prüfen',
  'checkout.confirmation.error.body':
    'Der Server hat nicht geantwortet. Ihre Zahlung ist davon nicht betroffen.',
  'checkout.confirmation.waking':
    'Unser Server wacht gerade aus einem Nickerchen auf, daher kann die erste Antwort bis zu einer Minute dauern. Einen Moment Geduld, Ihre Bestellung ist sicher.',
  'checkout.confirmation.tryAgain': 'Erneut versuchen',
  'checkout.confirmation.checkAgain': 'Erneut prüfen',
  'checkout.confirmation.continueShopping': 'Weiter einkaufen',
  'checkout.confirmation.yourOrder': 'Ihre Bestellung',
  'checkout.confirmation.delivery': 'Lieferung',
  'checkout.confirmation.shippingMethod': 'Versandart',
  'checkout.confirmation.contact': 'Kontakt',

  // ---------- messages from outside (Zod rules in @store/shared) ----------
  'msg.checkout.required': 'Pflichtfeld',
  'msg.checkout.emailInvalid': 'Ungültige E-Mail-Adresse',
  'msg.checkout.vetName': 'Geben Sie den Namen der Tierärztin oder des Tierarztes ein',
  'msg.checkout.vetClinic': 'Geben Sie die Praxis ein',
  'msg.checkout.countryUnsupported': 'In dieses Land liefern wir nicht',
};
