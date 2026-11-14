import type { demo as enNs } from '../en/demo';
import type { Entry } from '../types';

export const demo: Record<keyof typeof enNs, Entry> = {
  'demo.badge': 'Testshop',
  'demo.title': 'Demo-Helfer',
  'demo.intro': 'Sparen Sie sich das Tippen: Ein Klick füllt dieses Formular mit erfundenen Daten.',
  'demo.collapse': 'Einklappen',
  'demo.expand': 'Demo-Helfer: Formular ausfüllen',
  'demo.close': 'Demo-Helfer schließen',
  'demo.copy': 'Kopieren',
  'demo.copied': '{label} kopiert',
  'demo.copyFailed': 'Kopieren hat nicht geklappt. Markieren und kopieren Sie den Text von Hand.',
  'demo.email': 'E-Mail',
  'demo.password': 'Passwort',
  'demo.register.fill': 'Mit neuem Demo-Kunden ausfüllen',
  'demo.register.filled':
    'Ausgefüllt. Merken Sie sich das Passwort, wenn Sie sich später wieder anmelden möchten:',
  'demo.login.intro':
    'Melden Sie sich als Demo-Kunde an (mit Bestellungen, Punkten und Haustieren):',
  'demo.login.use': 'Als {name} anmelden',
  'demo.checkout.step': 'Schritt {number}: {title}',
  'demo.checkout.contact': 'Kontakt ausfüllen',
  'demo.checkout.address': 'Adresse ausfüllen',
  'demo.checkout.detailsHint':
    'Erfundener Name, E-Mail und Telefon, dann eine Adresse in einem Land, in das dieser Shop liefert.',
  'demo.checkout.delivery': 'Günstigste Option wählen',
  'demo.checkout.deliveryHint':
    'Jede Option funktioniert: Aus dieser Demo wird nie etwas verschickt.',
  'demo.checkout.paymentHint':
    'Die Kartenfelder liegen in Stripes geschütztem Rahmen, keine Seite kann sie ausfüllen. Geben Sie die Stripe-Testkarte ein:',
  'demo.checkout.cardNumber': 'Kartennummer',
  'demo.checkout.expiry': 'Ablaufdatum',
  'demo.checkout.expiryHint': 'oder ein beliebiges Datum in der Zukunft',
  'demo.checkout.cvc': 'Prüfnummer',
  'demo.checkout.cvcHint': 'oder drei beliebige Ziffern',
  'demo.checkout.why4242':
    'Warum 4242? Zahlungen laufen im Stripe-Testmodus, der nur Stripes eigene Testnummern annimmt: Eine echt wirkende Karte wie 4111 1111 1111 1111 wird abgelehnt. Es fließt kein Geld.',
  'demo.checkout.otherMethods':
    'Weitere Testzahlarten (iDEAL, SEPA-Lastschrift, Klarna …) erscheinen im Zahlungsformular, sobald sie aktiviert sind.',
};
