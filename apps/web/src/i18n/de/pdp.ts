import type { pdp as enNs } from '../en/pdp';
import type { Entry } from '../types';

export const pdp: Record<keyof typeof enNs, Entry> = {
  // ---- product page ----
  'pdp.page.home': 'Startseite',
  'pdp.page.loadError.seoTitle': 'Etwas ist schiefgelaufen',
  'pdp.page.loadError.title': 'Dieses Produkt konnte nicht geladen werden',
  'pdp.page.loadError.retry': 'Erneut versuchen',
  'pdp.page.loading': 'Produkt wird geladen',
  'pdp.page.reviewCount': { one: '{count} Bewertung', other: '{count} Bewertungen' },
  'pdp.page.soldOut': 'Ausverkauft',
  'pdp.page.inStock': 'Auf Lager',
  'pdp.page.sku': 'Art.-Nr. {sku}',
  'pdp.page.trialSize': 'Probiergröße',
  'pdp.page.trialNote':
    'Eine kleine Packung zum Testen, bevor Sie sich festlegen: eine pro Person. Die normale Größe ist unbegrenzt erhältlich.',
  'pdp.page.attr.pet': 'Haustier',
  'pdp.page.attr.material': 'Material',
  'pdp.page.attr.ageStage': 'Lebensphase',
  'pdp.page.attr.size': 'Größe',
  'pdp.page.attr.brand': 'Marke',
  'pdp.page.attr.goodFor': 'Gut für',
  'pdp.page.gallery.heading': 'So sieht es zu Hause aus',
  'pdp.page.gallery.intro': 'Tippen Sie auf ein Foto, um den Look zu entdecken.',

  // ---- tabs ----
  'pdp.tabs.label': 'Produktinformationen',
  'pdp.tabs.description': 'Beschreibung',
  'pdp.tabs.specs': 'Details',
  'pdp.tabs.feeding': 'Fütterungsempfehlung',
  'pdp.tabs.delivery': 'Lieferung & Rücksendung',

  // ---- specs ----
  'pdp.specs.heading': 'Technische Daten',
  'pdp.specs.analysis': 'Analytische Bestandteile',
  'pdp.specs.per100': 'Pro 100 g.',
  'pdp.specs.per100Variant': 'Pro 100 g, {variant}.',
  'pdp.specs.constituent.protein': 'Rohprotein',
  'pdp.specs.constituent.fat': 'Rohfett',
  'pdp.specs.constituent.fibre': 'Rohfaser',
  'pdp.specs.constituent.ash': 'Rohasche',
  'pdp.specs.constituent.moisture': 'Feuchtigkeit',
  'pdp.specs.constituent.kcal': 'Energie',
  'pdp.specs.kcal': '{value} kcal',
  'pdp.specs.percent': '{value} %',

  // ---- FAQ ----
  'pdp.faq.heading': 'Fragen und Antworten',

  // ---- feeding ----
  'pdp.feeding.stage.any': 'Alle Lebensphasen',
  'pdp.feeding.stage.puppy': 'Welpe oder Kitten',
  'pdp.feeding.stage.adult': 'Ausgewachsen',
  'pdp.feeding.stage.senior': 'Senior',
  'pdp.feeding.table.caption': 'Tagesmenge nach Gewicht des Tieres. Nur als Richtwert.',
  'pdp.feeding.table.stage': 'Lebensphase',
  'pdp.feeding.table.weight': 'Gewicht des Tieres',
  'pdp.feeding.table.perDay': 'Pro Tag',
  'pdp.feeding.table.weightRange': '{from} bis {to} kg',
  'pdp.feeding.heading': 'Wie viel soll ich füttern?',
  'pdp.feeding.weightLabel': 'Gewicht des Tieres (kg)',
  'pdp.feeding.stageLabel': 'Lebensphase',
  'pdp.feeding.mealsLabel': 'Mahlzeiten pro Tag',
  'pdp.feeding.sliderLabel': 'Schieberegler für das Gewicht des Tieres',
  'pdp.feeding.invalidWeight': 'Geben Sie das Gewicht Ihres Tieres in kg ein, zum Beispiel 7,5.',
  'pdp.feeding.daily.1': 'Etwa {daily} pro Tag, eine Mahlzeit',
  'pdp.feeding.daily.2': 'Etwa {daily} pro Tag, zwei Mahlzeiten à {portion}',
  'pdp.feeding.daily.3': 'Etwa {daily} pro Tag, drei Mahlzeiten à {portion}',
  'pdp.feeding.daily.4': 'Etwa {daily} pro Tag, vier Mahlzeiten à {portion}',
  'pdp.feeding.clampBelow':
    'Unsere Empfehlung beginnt bei {from} kg, daher gilt diese Menge für {from} kg. Fragen Sie Ihre Tierärztin oder Ihren Tierarzt zu einem so leichten Tier.',
  'pdp.feeding.clampAbove':
    'Unsere Empfehlung endet bei {to} kg, daher gilt diese Menge für {last} kg. Fragen Sie Ihre Tierärztin oder Ihren Tierarzt zu einem so schweren Tier.',
  'pdp.feeding.bagLessThanDay': 'Diese Packung reicht nicht für einen ganzen Tag.',
  'pdp.feeding.bagLasts': {
    one: 'Dieser Sack reicht etwa {count} Tag, etwa {price} pro Tag.',
    other: 'Dieser Sack reicht etwa {count} Tage, etwa {price} pro Tag.',
  },
  'pdp.feeding.pickMonth': 'Wählen Sie die Packungsgröße, die einen Monat reicht',
  'pdp.feeding.pickMonthNote': {
    one: '{name}: etwa {count} Tag.',
    other: '{name}: etwa {count} Tage.',
  },
  'pdp.feeding.alreadyMonth': 'Diese Größe reicht bereits einen Monat oder länger.',
  'pdp.feeding.disclaimer':
    'Eine Empfehlung, keine tierärztliche Beratung. Jedes Tier ist anders: Fragen Sie Ihre Tierärztin oder Ihren Tierarzt, wenn Ihr Tier krank, trächtig, sehr jung oder sehr alt ist.',
  'pdp.feeding.rangeKg': '{value} kg',

  // ---- delivery panel ----
  'pdp.delivery.heading': 'Lieferung',
  'pdp.delivery.shipIntro':
    'Bestellungen werden an Werktagen aus unserem Lager versandt. Sie wählen an der Kasse Standard- oder Expresslieferung und sehen den genauen Preis, bevor Sie bezahlen. Preise und Lieferzeiten finden Sie auf der Seite',
  'pdp.delivery.shipLink': 'Versand',
  'pdp.delivery.shipOutro': '.',
  'pdp.delivery.cutoffNote':
    'Bestellungen, die an einem Werktag vor 15:00 Uhr Amsterdamer Zeit eingehen, verschicken wir noch am selben Tag.',
  'pdp.delivery.returnsHeading': 'Rücksendung',
  'pdp.delivery.returnsIntro':
    'Anders überlegt? Unbenutzte Artikel in der Originalverpackung können innerhalb von 30 Tagen zurückgesendet werden. Geöffnete Lebensmittel und Hygieneartikel sind von der Rücksendung ausgeschlossen, es sei denn, sie sind fehlerhaft. Siehe',
  'pdp.delivery.returnsLink': 'Rücksendung und Widerruf',

  // ---- delivery estimate ----
  'pdp.estimate.orderIn': 'Bestellen Sie innerhalb von {countdown}, Lieferung {range}',
  'pdp.estimate.orderNow': 'Jetzt bestellen, Versand {day}, Lieferung {range}',
  'pdp.estimate.methodArrives': '{method}: Lieferung {range}',
  'pdp.estimate.methodArrivesSpoken': '{method}: Lieferung {range}.',
  'pdp.estimate.range': '{from} bis {to}',
  'pdp.estimate.spoken':
    'Bestellen Sie an einem Werktag vor {time}, dann wird Ihre Bestellung am selben Tag versandt.',
  'pdp.estimate.cutoffNote': 'Bestellschluss {time} Uhr Amsterdamer Zeit, Montag bis Freitag.',
  'pdp.estimate.countdownHm': '{h} Std. {m} Min.',
  'pdp.estimate.countdownM': '{m} Min.',
  'pdp.estimate.countdownUnderMinute': 'weniger als einer Minute',

  // ---- size guide ----
  'pdp.size.button': 'Größentabelle',
  'pdp.size.sizeColumn': 'Größe',
  'pdp.size.yourSize': '(Ihre Größe)',
  'pdp.size.howToMeasure': 'So messen Sie',
  'pdp.size.measure.neck': 'Hals',
  'pdp.size.measure.chest': 'Brust',
  'pdp.size.measure.length': 'Länge',

  // ---- bought together ----
  'pdp.bought.heading': 'Oft zusammen gekauft',
  'pdp.bought.notAvailable': 'Nicht verfügbar',
  'pdp.bought.withVariant': '{name} ({variant})',
  'pdp.bought.anItem': 'Ein Artikel',
  'pdp.bought.problem': '{name}: {message}',
  'pdp.bought.beforeDiscounts': 'Vor Rabatten.',

  // ---- bundles and kits ----
  'pdp.bundle.heading': 'Das ist im Set enthalten',
  'pdp.bundle.qtyLine': '{qty} x {name}',
  'pdp.bundle.saving': '{saving} sparen gegenüber Einzelkauf ({individual})',
  'pdp.kits.heading': 'Als Set kaufen',
  'pdp.kits.save': '{saving} sparen',

  // ---- rails ----
  'pdp.related.heading': 'Das könnte Ihnen auch gefallen',
  'pdp.related.label': 'Ähnliche Produkte',
  'pdp.recent.heading': 'Zuletzt angesehen',
  'pdp.rail.prev': 'Vorherige Produkte',
  'pdp.rail.next': 'Weitere Produkte',
  'pdp.bought.thisItemBadge': 'Dieser Artikel',
  'pdp.bought.variantSpoken': ', {variant}',
  'pdp.bought.totalFor': { one: 'Gesamt für {count} Artikel', other: 'Gesamt für {count} Artikel' },
  'pdp.bought.saving': 'Du sparst {amount}',
  'pdp.bought.addCount': {
    one: '{count} Artikel in den Warenkorb',
    other: '{count} Artikel in den Warenkorb',
  },
  'pdp.bought.added': 'Im Warenkorb',
  'pdp.bought.chooseOne': 'Wähle mindestens einen Artikel',
};
