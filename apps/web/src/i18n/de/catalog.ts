import type { catalog as enNs } from '../en/catalog';
import type { Entry } from '../types';

export const catalog: Record<keyof typeof enNs, Entry> = {
  // Shared
  'catalog.productCount': { one: '{count} Produkt', other: '{count} Produkte' },
  'catalog.quickFilters': 'Schnellfilter',

  // Add to cart
  'catalog.addToCart.lowStock': 'Nur noch wenige',
  'catalog.addToCart.soldOut': 'Ausverkauft',
  'catalog.addToCart.add': 'In den Warenkorb',
  'catalog.addToCart.unavailable': 'Das Hinzufügen zum Warenkorb ist hier nicht möglich.',

  // Filters: panel, chips, facet names
  'catalog.filters.applied': 'Aktive Filter',
  'catalog.filters.inStock': 'Auf Lager',
  'catalog.filters.inStockOnly': 'Nur verfügbare Artikel',
  'catalog.filters.brand': 'Marke',
  'catalog.filters.health': 'Nach Gesundheitsthema',
  'catalog.filters.chipBrand': 'Marke: {name}',
  'catalog.filters.chipHealth': 'Gesundheitsthema: {name}',
  'catalog.filters.chipLabel': 'Label: {name}',
  'catalog.filters.chipFacet': '{facet}: {value}',
  'catalog.filters.remove': 'Filter {label} entfernen',
  'catalog.filters.clearAll': 'Alle löschen',
  'catalog.filters.option': '{label} ({count})',
  'catalog.filters.showFewer': 'Weniger Optionen für {label} anzeigen',
  'catalog.filters.showMore': '{count} weitere anzeigen',
  'catalog.filters.priceRange': 'Preis: {min} - {max}',
  'catalog.filters.priceFrom': 'Preis: ab {min}',
  'catalog.filters.priceUpTo': 'Preis: bis {max}',
  'catalog.facet.pet': 'Haustier',
  'catalog.facet.material': 'Material',
  'catalog.facet.ageStage': 'Lebensphase',
  'catalog.facet.allAges': 'Alle Altersstufen',
  'catalog.facet.petDog': 'Hunde',
  'catalog.facet.petCat': 'Katzen',
  'catalog.facet.petBird': 'Vögel',
  'catalog.facet.petFish': 'Fische',
  'catalog.facet.petSmall': 'Kleintiere',
  'catalog.facet.petReptile': 'Reptilien',

  // Sort
  'catalog.sort.relevance': 'Relevanz',
  'catalog.sort.newest': 'Neueste',
  'catalog.sort.priceAsc': 'Preis: aufsteigend',
  'catalog.sort.priceDesc': 'Preis: absteigend',
  'catalog.sort.unitPriceAsc': 'Niedrigster Grundpreis',
  'catalog.sort.name': 'Name: A bis Z',

  // Price slider
  'catalog.price.title': 'Preis',
  'catalog.price.range': '{min} bis {max}',
  'catalog.price.min': 'Mindestpreis',
  'catalog.price.max': 'Höchstpreis',

  // Gallery
  'catalog.gallery.noImage': 'Kein Bild verfügbar',
  'catalog.gallery.images': 'Produktbilder',
  'catalog.gallery.imageOf': 'Bild {n} von {total}: {alt}',

  // Pagination
  'catalog.pagination.label': 'Seitennavigation',
  'catalog.pagination.prev': 'Zurück',
  'catalog.pagination.next': 'Weiter',
  'catalog.pagination.page': 'Seite {page}',

  // Pet tiles (names of the six pet categories)
  'catalog.petTile.dogs': 'Hunde',
  'catalog.petTile.cats': 'Katzen',
  'catalog.petTile.birds': 'Vögel',
  'catalog.petTile.fish': 'Fische',
  'catalog.petTile.smallPets': 'Kleintiere',
  'catalog.petTile.reptiles': 'Reptilien',

  // Product card
  'catalog.card.noImage': 'Kein Bild',
  'catalog.card.soldOut': 'Ausverkauft',
  'catalog.card.reviews': { one: '{count} Bewertung', other: '{count} Bewertungen' },
  'catalog.card.coloursOf': 'Farben von {name}',
  'catalog.card.moreColours': { one: '+{count} Farbe', other: '+{count} Farben' },

  // Quantity stepper
  'catalog.quantity.label': 'Menge',
  'catalog.quantity.labelOf': 'Menge von {subject}',
  'catalog.quantity.decrease': 'Menge verringern',
  'catalog.quantity.decreaseOf': 'Menge von {subject} verringern',
  'catalog.quantity.increase': 'Menge erhöhen',
  'catalog.quantity.increaseOf': 'Menge von {subject} erhöhen',

  // Variant picker
  'catalog.variant.colour': 'Farbe',
  'catalog.variant.sizeXS': 'Extra klein',
  'catalog.variant.sizeS': 'Klein',
  'catalog.variant.sizeM': 'Mittel',
  'catalog.variant.sizeL': 'Groß',
  'catalog.variant.sizeXL': 'Extra groß',
  'catalog.variant.soldOut': '{label} (ausverkauft)',
  'catalog.variant.unavailable': '{label} (nicht verfügbar)',

  // Listing
  'catalog.list.loadError': 'Die Produkte konnten nicht geladen werden.',
  'catalog.list.loadErrorHint': 'Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.',
  'catalog.list.tryAgain': 'Erneut versuchen',
  'catalog.list.loading': 'Produkte werden geladen',
  'catalog.list.filters': 'Filter',
  'catalog.list.filtersCount': 'Filter ({count})',
  'catalog.list.none': 'Keine Produkte',
  'catalog.list.showing': {
    one: '{first}-{last} von {count} Produkt',
    other: '{first}-{last} von {count} Produkten',
  },
  'catalog.list.showProducts': {
    one: '{count} Produkt anzeigen',
    other: '{count} Produkte anzeigen',
  },
  'catalog.list.sortBy': 'Sortieren nach',
  'catalog.list.products': 'Produkte',
  'catalog.empty.pageMissing': 'Diese Seite gibt es nicht',
  'catalog.empty.pageMissingHint': 'So viele Ergebnisseiten gibt es nicht.',
  'catalog.empty.firstPage': 'Zur ersten Seite',
  'catalog.empty.noResults': 'Keine Ergebnisse für „{q}“',
  'catalog.empty.noMatch': 'Keine passenden Produkte',
  'catalog.empty.removeFilter': 'Entfernen Sie einen Filter, um mehr zu sehen.',
  'catalog.empty.tryWords':
    'Versuchen Sie weniger oder andere Wörter. Die Suche findet ganze Wörter, prüfen Sie also die Schreibweise.',
  'catalog.empty.nothingYet':
    'Hier gibt es noch nichts. Schauen Sie sich gern bei einem anderen Tier um, bis wir wieder aufgefüllt haben.',
  'catalog.empty.clearFilters': 'Filter löschen',

  // Pages
  'catalog.page.home': 'Startseite',
  'catalog.page.brands': 'Marken',
  'catalog.page.error': 'Etwas ist schiefgelaufen',
  'catalog.page.tryAgain': 'Erneut versuchen',
  'catalog.category.loadError': 'Diese Kategorie konnte nicht geladen werden',
  'catalog.category.loading': 'Kategorie wird geladen',
  'catalog.category.subcategories': 'Unterkategorien',
  'catalog.brand.loadError': 'Diese Marke konnte nicht geladen werden',
  'catalog.brand.loading': 'Marke wird geladen',
  'catalog.brands.description':
    'Die Pawsome-Hausmarken: Leckerlis, Betten, Terrarienzubehör und mehr.',
  'catalog.brands.title': 'Unsere Marken',
  'catalog.brands.intro':
    'Sechs Marken, ein Anspruch: Jedes Produkt wird zu Hause von unserem wählerischen Testteam aus Haustieren geprüft, bevor es in den Shop kommt.',
  'catalog.brands.loadError': 'Die Marken konnten nicht geladen werden.',
  'catalog.collection.loadError': 'Diese Kollektion konnte nicht geladen werden',
  'catalog.collection.loading': 'Kollektion wird geladen',
  'catalog.collection.until': 'Bis {date}',

  // Messages from outside
  'msg.catalog.priceFormat': 'Geben Sie einen Preis wie 12,50 ein',
  'catalog.brands.shop': 'Zur Marke',
  'catalog.brand.storyTitle': 'Unsere Geschichte',
};
