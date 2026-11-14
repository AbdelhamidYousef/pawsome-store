import type { Dictionary } from '../types';

export const catalog = {
  // Shared
  'catalog.productCount': { one: '{count} product', other: '{count} products' },
  'catalog.quickFilters': 'Quick filters',

  // Add to cart
  'catalog.addToCart.lowStock': 'Only a few left',
  'catalog.addToCart.soldOut': 'Sold out',
  'catalog.addToCart.add': 'Add to cart',
  'catalog.addToCart.unavailable': 'Adding to the cart is not available here.',

  // Filters: panel, chips, facet names
  'catalog.filters.applied': 'Applied filters',
  'catalog.filters.inStock': 'In stock',
  'catalog.filters.inStockOnly': 'In stock only',
  'catalog.filters.brand': 'Brand',
  'catalog.filters.health': 'Shop by health need',
  'catalog.filters.chipBrand': 'Brand: {name}',
  'catalog.filters.chipHealth': 'Health need: {name}',
  'catalog.filters.chipLabel': 'Label: {name}',
  'catalog.filters.chipFacet': '{facet}: {value}',
  'catalog.filters.remove': 'Remove filter {label}',
  'catalog.filters.clearAll': 'Clear all',
  'catalog.filters.option': '{label} ({count})',
  'catalog.filters.showFewer': 'Show fewer {label} options',
  'catalog.filters.showMore': 'Show {count} more',
  'catalog.filters.priceRange': 'Price: {min} - {max}',
  'catalog.filters.priceFrom': 'Price: from {min}',
  'catalog.filters.priceUpTo': 'Price: up to {max}',
  'catalog.facet.pet': 'Pet',
  'catalog.facet.material': 'Material',
  'catalog.facet.ageStage': 'Age stage',
  'catalog.facet.allAges': 'All ages',
  'catalog.facet.petDog': 'Dogs',
  'catalog.facet.petCat': 'Cats',
  'catalog.facet.petBird': 'Birds',
  'catalog.facet.petFish': 'Fish',
  'catalog.facet.petSmall': 'Small pets',
  'catalog.facet.petReptile': 'Reptiles',

  // Sort
  'catalog.sort.relevance': 'Best match',
  'catalog.sort.newest': 'Newest',
  'catalog.sort.priceAsc': 'Price: low to high',
  'catalog.sort.priceDesc': 'Price: high to low',
  'catalog.sort.unitPriceAsc': 'Lowest unit price',
  'catalog.sort.name': 'Name: A to Z',

  // Price slider
  'catalog.price.title': 'Price',
  'catalog.price.range': '{min} to {max}',
  'catalog.price.min': 'Minimum price',
  'catalog.price.max': 'Maximum price',

  // Gallery
  'catalog.gallery.noImage': 'No image available',
  'catalog.gallery.images': 'Product images',
  'catalog.gallery.imageOf': 'Image {n} of {total}: {alt}',

  // Pagination
  'catalog.pagination.label': 'Pagination',
  'catalog.pagination.prev': 'Prev',
  'catalog.pagination.next': 'Next',
  'catalog.pagination.page': 'Page {page}',

  // Pet tiles (names of the six pet categories)
  'catalog.petTile.dogs': 'Dogs',
  'catalog.petTile.cats': 'Cats',
  'catalog.petTile.birds': 'Birds',
  'catalog.petTile.fish': 'Fish',
  'catalog.petTile.smallPets': 'Small Pets',
  'catalog.petTile.reptiles': 'Reptiles',

  // Product card
  'catalog.card.noImage': 'No image',
  'catalog.card.soldOut': 'Sold out',
  'catalog.card.reviews': { one: '{count} review', other: '{count} reviews' },
  'catalog.card.coloursOf': 'Colours of {name}',
  'catalog.card.moreColours': { one: '+{count} colour', other: '+{count} colours' },

  // Quantity stepper
  'catalog.quantity.label': 'Quantity',
  'catalog.quantity.labelOf': 'Quantity of {subject}',
  'catalog.quantity.decrease': 'Decrease quantity',
  'catalog.quantity.decreaseOf': 'Decrease quantity of {subject}',
  'catalog.quantity.increase': 'Increase quantity',
  'catalog.quantity.increaseOf': 'Increase quantity of {subject}',

  // Variant picker
  'catalog.variant.colour': 'Colour',
  'catalog.variant.sizeXS': 'Extra small',
  'catalog.variant.sizeS': 'Small',
  'catalog.variant.sizeM': 'Medium',
  'catalog.variant.sizeL': 'Large',
  'catalog.variant.sizeXL': 'Extra large',
  'catalog.variant.soldOut': '{label} (sold out)',
  'catalog.variant.unavailable': '{label} (unavailable)',

  // Listing
  'catalog.list.loadError': 'We could not load the products.',
  'catalog.list.loadErrorHint': 'Check your connection and try again.',
  'catalog.list.tryAgain': 'Try again',
  'catalog.list.loading': 'Loading products',
  'catalog.list.filters': 'Filters',
  'catalog.list.filtersCount': 'Filters ({count})',
  'catalog.list.none': 'No products',
  'catalog.list.showing': {
    one: 'Showing {first}-{last} of {count} product',
    other: 'Showing {first}-{last} of {count} products',
  },
  'catalog.list.showProducts': { one: 'Show {count} product', other: 'Show {count} products' },
  'catalog.list.sortBy': 'Sort by',
  'catalog.list.products': 'Products',
  'catalog.empty.pageMissing': 'That page does not exist',
  'catalog.empty.pageMissingHint': 'There are fewer pages of results than that.',
  'catalog.empty.firstPage': 'Go to the first page',
  'catalog.empty.noResults': 'No results for "{q}"',
  'catalog.empty.noMatch': 'No products match',
  'catalog.empty.removeFilter': 'Try removing a filter to see more.',
  'catalog.empty.tryWords':
    'Try fewer or different words. Search matches whole words, so check the spelling.',
  'catalog.empty.nothingYet':
    'There is nothing here yet. Have a look at another pet while we restock.',
  'catalog.empty.clearFilters': 'Clear filters',

  // Pages
  'catalog.page.home': 'Home',
  'catalog.page.brands': 'Brands',
  'catalog.page.error': 'Something went wrong',
  'catalog.page.tryAgain': 'Try again',
  'catalog.category.loadError': 'We could not load this category',
  'catalog.category.loading': 'Loading category',
  'catalog.category.subcategories': 'Subcategories',
  'catalog.brand.loadError': 'We could not load this brand',
  'catalog.brand.loading': 'Loading brand',
  'catalog.brands.description': 'The Pawsome house brands: bakes, beds, habitat gear and more.',
  'catalog.brands.title': 'Our brands',
  'catalog.brands.intro':
    'Six labels, one standard: every product is tested at home by our fussy panel of pets before it reaches the shop.',
  'catalog.brands.loadError': 'We could not load the brands.',
  'catalog.collection.loadError': 'We could not load this collection',
  'catalog.collection.loading': 'Loading collection',
  'catalog.collection.until': 'Until {date}',

  // Messages from outside
  'msg.catalog.priceFormat': 'Enter a price like 12.50',
  'catalog.brands.shop': 'Shop the brand',
  'catalog.brand.storyTitle': 'Our story',
  'catalog.quickAdd.add': 'Add to cart',
  'catalog.quickAdd.added': 'Added',
  'catalog.quickAdd.notify': 'Notify me',
  'catalog.quickAdd.notifyLabel': 'Notify me when {name} is back',
  'catalog.quickAdd.details': 'View full details',
  'catalog.quickAdd.soldOutNote':
    'This option is sold out. Leave your email and we will tell you when it is back.',
  'catalog.quickAdd.loadError': 'We could not load this product. Please try again.',
  'catalog.quickAdd.addShort': 'Add to cart',
  'catalog.quickAdd.forProduct': '{name}',
  'catalog.material.cotton': 'Cotton',
  'catalog.material.rope': 'Rope',
  'catalog.material.rubber': 'Rubber & silicone',
  'catalog.material.plush': 'Plush',
  'catalog.material.fabric': 'Fleece & fabric',
  'catalog.material.nylon': 'Nylon',
  'catalog.material.metal': 'Metal',
  'catalog.material.ceramic': 'Ceramic',
  'catalog.material.plastic': 'Plastic',
  'catalog.material.glass': 'Glass',
  'catalog.material.wood': 'Wood & bamboo',
  'catalog.material.natural': 'Natural materials',
} satisfies Dictionary;
