import type { Dictionary } from '../types';

export const pdp = {
  // ---- product page ----
  'pdp.page.home': 'Home',
  'pdp.page.loadError.seoTitle': 'Something went wrong',
  'pdp.page.loadError.title': 'We could not load this product',
  'pdp.page.loadError.retry': 'Try again',
  'pdp.page.loading': 'Loading product',
  'pdp.page.reviewCount': { one: '{count} review', other: '{count} reviews' },
  'pdp.page.soldOut': 'Sold out',
  'pdp.page.inStock': 'In stock',
  'pdp.page.sku': 'SKU {sku}',
  'pdp.page.trialSize': 'Trial size',
  'pdp.page.trialNote':
    'A sample to try before you commit: one per customer. The full size has no limit.',
  'pdp.page.attr.pet': 'Pet',
  'pdp.page.attr.material': 'Material',
  'pdp.page.attr.ageStage': 'Age stage',
  'pdp.page.attr.size': 'Size',
  'pdp.page.attr.brand': 'Brand',
  'pdp.page.attr.goodFor': 'Good for',
  'pdp.page.gallery.heading': 'Seen at home',
  'pdp.page.gallery.intro': 'See it styled at home. Tap a photo to shop the look.',

  // ---- tabs ----
  'pdp.tabs.label': 'Product information',
  'pdp.tabs.description': 'Description',
  'pdp.tabs.specs': 'Specs',
  'pdp.tabs.feeding': 'Feeding guide',
  'pdp.tabs.delivery': 'Delivery & returns',

  // ---- specs ----
  'pdp.specs.heading': 'Specifications',
  'pdp.specs.analysis': 'Guaranteed analysis',
  'pdp.specs.per100': 'Per 100 g.',
  'pdp.specs.per100Variant': 'Per 100 g, {variant}.',
  'pdp.specs.constituent.protein': 'Protein',
  'pdp.specs.constituent.fat': 'Fat',
  'pdp.specs.constituent.fibre': 'Fibre',
  'pdp.specs.constituent.ash': 'Ash',
  'pdp.specs.constituent.moisture': 'Moisture',
  'pdp.specs.constituent.kcal': 'Energy',
  'pdp.specs.kcal': '{value} kcal',
  'pdp.specs.percent': '{value} %',

  // ---- FAQ ----
  'pdp.faq.heading': 'Questions and answers',

  // ---- feeding ----
  'pdp.feeding.stage.any': 'All life stages',
  'pdp.feeding.stage.puppy': 'Puppy or kitten',
  'pdp.feeding.stage.adult': 'Adult',
  'pdp.feeding.stage.senior': 'Senior',
  'pdp.feeding.table.caption': 'Daily amount by pet weight. Guidance only.',
  'pdp.feeding.table.stage': 'Life stage',
  'pdp.feeding.table.weight': 'Pet weight',
  'pdp.feeding.table.perDay': 'Per day',
  'pdp.feeding.table.weightRange': '{from} to {to} kg',
  'pdp.feeding.heading': 'How much should I feed?',
  'pdp.feeding.weightLabel': 'Pet weight (kg)',
  'pdp.feeding.stageLabel': 'Life stage',
  'pdp.feeding.mealsLabel': 'Meals a day',
  'pdp.feeding.sliderLabel': 'Pet weight slider',
  'pdp.feeding.invalidWeight': "Enter your pet's weight in kg, for example 7.5.",
  'pdp.feeding.daily.1': 'About {daily} a day, one meal',
  'pdp.feeding.daily.2': 'About {daily} a day, two meals of {portion}',
  'pdp.feeding.daily.3': 'About {daily} a day, three meals of {portion}',
  'pdp.feeding.daily.4': 'About {daily} a day, four meals of {portion}',
  'pdp.feeding.clampBelow':
    'Our guide starts at {from} kg, so this is the amount for {from} kg. Ask your vet about a pet this light.',
  'pdp.feeding.clampAbove':
    'Our guide stops at {to} kg, so this is the amount for {last} kg. Ask your vet about a pet this heavy.',
  'pdp.feeding.bagLessThanDay': 'This bag is less than a day of food.',
  'pdp.feeding.bagLasts': {
    one: 'This bag lasts about {count} day, about {price} a day.',
    other: 'This bag lasts about {count} days, about {price} a day.',
  },
  'pdp.feeding.pickMonth': 'Pick the bag size that lasts a month',
  'pdp.feeding.pickMonthNote': {
    one: '{name}: about {count} day.',
    other: '{name}: about {count} days.',
  },
  'pdp.feeding.alreadyMonth': 'This size already lasts a month or more.',
  'pdp.feeding.disclaimer':
    'A guide, not veterinary advice. Every pet is different: ask your vet if your pet is unwell, pregnant, very young or very old.',
  'pdp.feeding.rangeKg': '{value} kg',

  // ---- delivery panel ----
  'pdp.delivery.heading': 'Delivery',
  'pdp.delivery.shipIntro':
    'Orders ship from our warehouse on business days. You choose standard or express delivery at checkout and see the exact price before you pay. Read the',
  'pdp.delivery.shipLink': 'shipping page',
  'pdp.delivery.shipOutro': 'for prices and times.',
  'pdp.delivery.cutoffNote':
    'Orders placed before 15:00 Amsterdam time on a business day ship the same day.',
  'pdp.delivery.returnsHeading': 'Returns',
  'pdp.delivery.returnsIntro':
    'Changed your mind? Unused items in their original packaging can be returned within 30 days. Opened food and hygiene items cannot be returned unless they are faulty. See',
  'pdp.delivery.returnsLink': 'returns and withdrawal',

  // ---- delivery estimate ----
  'pdp.estimate.orderIn': 'Order in {countdown}, arrives {range}',
  'pdp.estimate.orderNow': 'Order now, ships {day}, arrives {range}',
  'pdp.estimate.methodArrives': '{method} arrives {range}',
  'pdp.estimate.methodArrivesSpoken': '{method} arrives {range}.',
  'pdp.estimate.range': '{from} to {to}',
  'pdp.estimate.spoken': 'Order before {time} on a business day and it ships the same day.',
  'pdp.estimate.cutoffNote': 'Cutoff {time}, Amsterdam time, Monday to Friday.',
  'pdp.estimate.countdownHm': '{h}h {m}m',
  'pdp.estimate.countdownM': '{m}m',
  'pdp.estimate.countdownUnderMinute': 'under a minute',

  // ---- size guide ----
  'pdp.size.button': 'Size guide',
  'pdp.size.sizeColumn': 'Size',
  'pdp.size.yourSize': '(your size)',
  'pdp.size.howToMeasure': 'How to measure',
  'pdp.size.measure.neck': 'Neck',
  'pdp.size.measure.chest': 'Chest',
  'pdp.size.measure.length': 'Length',

  // ---- bought together ----
  'pdp.bought.heading': 'Frequently bought together',
  'pdp.bought.notAvailable': 'Not available',
  'pdp.bought.withVariant': '{name} ({variant})',
  'pdp.bought.anItem': 'An item',
  'pdp.bought.problem': '{name}: {message}',
  'pdp.bought.beforeDiscounts': 'Before any discounts.',

  // ---- bundles and kits ----
  'pdp.bundle.heading': 'What is in the kit',
  'pdp.bundle.qtyLine': '{qty} x {name}',
  'pdp.bundle.saving': 'Save {saving} vs individually ({individual})',
  'pdp.kits.heading': 'Make it a kit',
  'pdp.kits.save': 'Save {saving}',

  // ---- rails ----
  'pdp.related.heading': 'You may also like',
  'pdp.related.label': 'Related products',
  'pdp.recent.heading': 'Recently viewed',
  'pdp.rail.prev': 'Previous products',
  'pdp.rail.next': 'Next products',
  'pdp.bought.thisItemBadge': 'This item',
  'pdp.bought.variantSpoken': ', {variant}',
  'pdp.bought.totalFor': { one: 'Total for {count} item', other: 'Total for {count} items' },
  'pdp.bought.saving': 'You save {amount}',
  'pdp.bought.addCount': { one: 'Add {count} item to cart', other: 'Add {count} items to cart' },
  'pdp.bought.added': 'Added to cart',
  'pdp.bought.chooseOne': 'Tick at least one item',
} satisfies Dictionary;
