import type { loyalty as enNs } from '../en/loyalty';
import type { Entry } from '../types';

export const loyalty: Record<keyof typeof enNs, Entry> = {
  // Checkout: pay with points
  'loyalty.redeem.title': 'Treuepunkte einlösen',
  'loyalty.redeem.balance': 'Sie haben {balance} Punkte (Wert: {worth}).',
  'loyalty.redeem.rate': '100 Punkte = {amount} Rabatt auf Ihre Artikel.',
  'loyalty.redeem.minimum': 'Mindestens {amount} zahlen Sie immer per Karte.',
  'loyalty.redeem.useMax': 'Maximum nutzen ({max})',
  'loyalty.redeem.clear': 'Zurücksetzen',
  'loyalty.redeem.applied': '{points} Punkte = {amount} Rabatt',

  // Earn points (product page, cart)
  'loyalty.earn.signInLink': 'Anmelden und',
  'loyalty.earn.signInRest': 'Treuepunkte für diese Bestellung sammeln.',
  'loyalty.earn.points': { one: '{count} Punkt sammeln', other: '{count} Punkte sammeln' },

  // Footer note and charity page
  'loyalty.charity.seoTitle': 'Unser Tierheim',
  'loyalty.charity.seoDescription':
    'Whisker Hollow Rescue ist das Tierheim, das Pawsome unterstützt. Runden Sie an der Kasse auf oder spenden Sie Ihre Punkte.',
  'loyalty.charity.note':
    'Jede Aufrundung an der Kasse und jeder gespendete Punkt fließt in die Summe unten ein.',
  'loyalty.charity.error': 'Die Summe konnte gerade nicht geladen werden.',
  'loyalty.charity.given': 'Bisher gespendet',
  'loyalty.charity.donations': { one: 'aus {count} Spende', other: 'aus {count} Spenden' },
  'loyalty.charity.waysTitle': 'Zwei Wege zu helfen',
  'loyalty.charity.checkoutLabel': 'Beim Bezahlen:',
  'loyalty.charity.checkoutText':
    'Setzen Sie ein Häkchen bei „Aufrunden“, und der Gesamtbetrag wird auf den nächsten vollen Euro erhöht. Der Aufschlag erscheint als eigene Zeile in Ihrer Bestellung und wird nie rabattiert.',
  'loyalty.charity.pointsLabel': 'Mit Punkten:',
  'loyalty.charity.pointsText': 'Spenden Sie beliebig viele Ihrer Treuepunkte (1 Punkt = 1 Cent)',
  'loyalty.charity.pointsOnYour': 'auf Ihrer',
  'loyalty.charity.rewardsPage': 'Prämienseite',
  'loyalty.charity.pointsOnceYou': 'sobald Sie sich',
  'loyalty.charity.signIn': 'anmelden',
  'loyalty.charity.roundUpNote':
    'Ein Aufrundungsbetrag wird gezählt, sobald die Bestellung bezahlt ist, und zurückgebucht, wenn die Bestellung erstattet wird.',

  // Referral panel
  'loyalty.referral.title': 'Freunde werben',
  'loyalty.referral.how':
    'Teilen Sie Ihren Link. Wenn ein Freund ein Konto erstellt und seine erste Bestellung ab {min} bezahlt, erhalten Sie beide einen Code über {reward} (gültig {days} Tage, für eine Bestellung ab {min}).',
  'loyalty.referral.copy': 'Link kopieren',
  'loyalty.referral.copied': 'Kopiert',
  'loyalty.referral.linkCopied': 'Link kopiert',
  'loyalty.referral.stats':
    '{qualified} belohnt, {pending} warten auf eine erste Bestellung. Bis zu {max} pro Jahr.',
  'loyalty.referral.statsRejected':
    '{qualified} belohnt, {pending} warten auf eine erste Bestellung, {rejected} nicht berechtigt. Bis zu {max} pro Jahr.',

  // /account/rewards
  'loyalty.rewards.title': 'Prämien',
  'loyalty.rewards.pointsError': 'Ihre Punkte konnten nicht geladen werden.',
  'loyalty.rewards.retry': 'Erneut versuchen',
  'loyalty.rewards.balance': 'Ihr Punktestand',
  'loyalty.rewards.pointsUnit': 'Punkte',
  'loyalty.rewards.worth': 'An der Kasse {amount} wert',
  'loyalty.rewards.earnRateOne': 'Sie erhalten 1 Punkt pro ausgegebenem Euro.',
  'loyalty.rewards.earnRatePercent': 'Sie erhalten {percent} % pro ausgegebenem Euro.',
  'loyalty.rewards.nextTier': 'Noch {points} Punkte sammeln, um {label} zu erreichen.',
  'loyalty.rewards.topTier': 'Sie sind in der höchsten Stufe. Brav gemacht!',
  'loyalty.rewards.spendTitle': 'Punkte ausgeben',
  'loyalty.rewards.rewardsError': 'Die Prämien konnten nicht geladen werden.',
  'loyalty.rewards.noRewards': 'Derzeit sind keine Prämien verfügbar.',
  'loyalty.rewards.cost': '{points} Punkte',
  'loyalty.rewards.redeem.button': 'Einlösen',
  'loyalty.rewards.redeem.morePoints': 'Noch {short} Punkte',
  'loyalty.rewards.redeem.for': 'für {name}',
  'loyalty.rewards.redeem.code': 'Ihr Code lautet {code}',
  'loyalty.rewards.redeem.failed': 'Das konnte nicht eingelöst werden.',
  'loyalty.rewards.giveAwayTitle': 'Oder verschenken',
  'loyalty.rewards.donate.giveTo': 'Punkte spenden an',
  'loyalty.rewards.donate.aboutShelter': ', das Tierheim, das wir unterstützen (1 Punkt = 1 Cent).',
  'loyalty.rewards.donate.label': 'Zu spendende Punkte',
  'loyalty.rewards.donate.button': 'Spenden',
  'loyalty.rewards.donate.thanks': 'Danke! {points} Punkte gingen an das Tierheim.',
  'loyalty.rewards.donate.failed': 'Das konnte nicht gespendet werden.',
  'loyalty.rewards.codesTitle': 'Ihre Codes',
  'loyalty.rewards.codesEmpty':
    'Codes, die Sie mit Punkten kaufen, erscheinen hier. Wenden Sie einen im Warenkorb an.',
  'loyalty.rewards.code.freeDelivery': 'Kostenlose Lieferung',
  'loyalty.rewards.code.fixedOff': '{amount} Rabatt',
  'loyalty.rewards.code.percentOff': '{percent} % Rabatt',
  'loyalty.rewards.code.minSpend': ', Mindestbestellwert {amount}',
  'loyalty.rewards.code.used': 'Eingelöst',
  'loyalty.rewards.code.validUntil': 'Gültig bis {date}',
  'loyalty.rewards.code.noExpiry': 'Unbegrenzt gültig',
  'loyalty.rewards.historyTitle': 'Punkteverlauf',
  'loyalty.rewards.historyEmpty':
    'Noch keine Punkte. Jeder Euro, den Sie für eine Bestellung ausgeben, bringt Punkte.',
  'loyalty.rewards.historyCaption': 'Ihre letzten 50 Punktebewegungen',
  'loyalty.rewards.colDate': 'Datum',
  'loyalty.rewards.colWhat': 'Vorgang',
  'loyalty.rewards.colPoints': 'Punkte',
  'loyalty.rewards.kind.earn': 'Gesammelt',
  'loyalty.rewards.kind.redeem': 'Ausgegeben',
  'loyalty.rewards.kind.reversal': 'Erstattet oder zurückgebucht',
  'loyalty.rewards.kind.bonus': 'Bonus',
  'loyalty.rewards.kind.donate': 'Gespendet',
  'loyalty.rewards.kind.adjust': 'Korrektur',

  // Wishlist
  'loyalty.wishlist.title': 'Ihre Wunschliste',
  'loyalty.wishlist.saveLabel': '{name} auf die Wunschliste setzen',
  'loyalty.wishlist.saved': '{name} wurde auf Ihre Wunschliste gesetzt',
  'loyalty.wishlist.updateFailed':
    'Ihre Wunschliste konnte nicht aktualisiert werden. Bitte versuchen Sie es erneut.',
  'loyalty.wishlist.moveToCart': 'In den Warenkorb',
  'loyalty.wishlist.soldOut': 'Ausverkauft',
  'loyalty.wishlist.remove': 'Entfernen',
  'loyalty.wishlist.error': 'Ihre Wunschliste konnte gerade nicht geladen werden.',
  'loyalty.wishlist.empty':
    'Noch nichts gespeichert. Tippen Sie bei einem Produkt auf das Herz, um es hier zu merken.',
  'loyalty.wishlist.keepBrowsing': 'Weiter stöbern',
  'loyalty.wishlist.shareTitle': 'Wunschliste teilen',
  'loyalty.wishlist.shareText':
    'Alle, die den Link haben, sehen diese Artikel und Ihren Vornamen, sonst nichts. Wenn Sie das Teilen beenden, funktioniert der Link nicht mehr.',
  'loyalty.wishlist.stopSharing': 'Teilen beenden',
  'loyalty.wishlist.createLink': 'Link zum Teilen erstellen',
  'loyalty.wishlist.signIn': 'Melden Sie sich an,',
  'loyalty.wishlist.signInRest':
    'um Ihre Liste zu teilen. Ihre gespeicherten Artikel bleiben erhalten.',
  'loyalty.wishlist.sharedTitle': 'Eine geteilte Wunschliste',
  'loyalty.wishlist.ownerTitle': 'Wunschliste von {name}',
  'loyalty.wishlist.sharedEmpty': 'Derzeit steht nichts auf dieser Liste.',

  // Newsletter
  'loyalty.newsletter.seoTitle': 'Newsletter',
  'loyalty.newsletter.seoDescription': 'Tipps für Tiere und Angebote von Pawsome.',
  'loyalty.newsletter.pageTitle': 'Werden Sie Teil des Rudels',
  'loyalty.newsletter.pageText':
    'Abonnieren Sie den Newsletter und erhalten Sie 10 % Rabatt auf Ihre erste Bestellung, sobald Sie Ihre Adresse bestätigt haben.',
  'loyalty.newsletter.slotTitle':
    'Werden Sie Teil des Rudels: 10 % Rabatt auf Ihre erste Bestellung',
  'loyalty.newsletter.slotText':
    'Tipps für Ihre Tiere und hin und wieder ein Angebot. Zuerst senden wir einen Bestätigungslink, und jede Nachricht lässt sich mit einem Klick abbestellen. Lesen Sie die',
  'loyalty.newsletter.privacyLink': 'Datenschutzerklärung',
  'loyalty.newsletter.email': 'E-Mail',
  'loyalty.newsletter.pets': 'Welche Tiere haben Sie?',
  'loyalty.newsletter.consent':
    'Senden Sie mir Neuigkeiten, Angebote und Tipps für meine Tiere von Pawsome. Ich kann mich jederzeit mit einem Klick abmelden.',
  'loyalty.newsletter.consentRequired': 'Bitte setzen Sie das Häkchen, um zu abonnieren',
  'loyalty.newsletter.honeypot': 'Bitte leer lassen',
  'loyalty.newsletter.submit': 'Abonnieren und 10 % Rabatt sichern',
  'loyalty.newsletter.done':
    'Fast geschafft! Wenn diese Adresse E-Mails empfangen kann, ist ein Bestätigungslink unterwegs. Klicken Sie darauf, dann folgt Ihr Willkommenscode.',
  'loyalty.newsletter.tooMany':
    'Zu viele Anmeldungen über diese Verbindung. Bitte versuchen Sie es später erneut.',
  'loyalty.newsletter.failed':
    'Die Anmeldung war gerade nicht möglich. Bitte versuchen Sie es gleich noch einmal.',
  'loyalty.newsletter.token.incomplete':
    'Dieser Link ist unvollständig. Bitte öffnen Sie ihn erneut über die E-Mail.',
  'loyalty.newsletter.token.working': 'Wird bearbeitet',
  'loyalty.newsletter.token.expired': 'Dieser Link ist abgelaufen.',
  'loyalty.newsletter.token.invalid': 'Dieser Link ist nicht mehr gültig.',
  'loyalty.newsletter.token.signUpAgain': 'Erneut anmelden',
  'loyalty.newsletter.confirm.title': 'Abonnement bestätigen',
  'loyalty.newsletter.confirm.already':
    'Sie haben den Newsletter bereits abonniert. Ihren Willkommenscode finden Sie in der E-Mail, die wir gesendet haben.',
  'loyalty.newsletter.confirm.done':
    'Sie sind angemeldet! Wir haben Ihnen gerade Ihren Willkommenscode über 10 % per E-Mail geschickt.',
  'loyalty.newsletter.unsubscribe.title': 'Abbestellen',
  'loyalty.newsletter.unsubscribe.done':
    'Sie sind abgemeldet. Wir senden Ihnen keine Neuigkeiten mehr.',

  // Stock alerts
  'loyalty.stockAlerts.title': 'Bei Verfügbarkeit benachrichtigen',
  'loyalty.stockAlerts.email': 'E-Mail',
  'loyalty.stockAlerts.submit': 'Benachrichtigen',
  'loyalty.stockAlerts.done':
    'Alles klar. Wir benachrichtigen {email} einmalig, sobald der Artikel wieder da ist.',
  'loyalty.stockAlerts.inStock': 'Der Artikel ist gerade verfügbar: Laden Sie die Seite neu.',
  'loyalty.stockAlerts.limit':
    'Sie können sich für höchstens 5 Artikel gleichzeitig benachrichtigen lassen.',
  'loyalty.stockAlerts.tooMany': 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
  'loyalty.stockAlerts.failed':
    'Das konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.',
  'loyalty.stockAlerts.cancel.title': 'Benachrichtigung bei Verfügbarkeit',
  'loyalty.stockAlerts.cancel.done': 'Erledigt: Wir schreiben Ihnen nicht mehr zu diesem Artikel.',

  // Messages from outside (shared Zod rules)
  'msg.loyalty.emailInvalid': 'Geben Sie eine gültige E-Mail-Adresse ein',
  'loyalty.newsletter.perkTips': 'Pflegetipps für die Tiere, die Sie auswählen',
  'loyalty.newsletter.perkNew': 'Neue Spielzeuge und Leckerlis zuerst erfahren',
  'loyalty.newsletter.perkEasy': 'Jederzeit mit einem Klick abbestellen',
};
