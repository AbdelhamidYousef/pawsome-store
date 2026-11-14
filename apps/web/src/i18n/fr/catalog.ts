import type { catalog as enNs } from '../en/catalog';
import type { Entry } from '../types';

export const catalog: Record<keyof typeof enNs, Entry> = {
  // Shared
  'catalog.productCount': { one: '{count} produit', other: '{count} produits' },
  'catalog.quickFilters': 'Filtres rapides',

  // Add to cart
  'catalog.addToCart.lowStock': 'Bientôt épuisé',
  'catalog.addToCart.soldOut': 'Épuisé',
  'catalog.addToCart.add': 'Ajouter au panier',
  'catalog.addToCart.unavailable': 'L’ajout au panier n’est pas disponible ici.',

  // Filters: panel, chips, facet names
  'catalog.filters.applied': 'Filtres appliqués',
  'catalog.filters.inStock': 'En stock',
  'catalog.filters.inStockOnly': 'En stock uniquement',
  'catalog.filters.brand': 'Marque',
  'catalog.filters.health': 'Par besoin de santé',
  'catalog.filters.chipBrand': 'Marque : {name}',
  'catalog.filters.chipHealth': 'Besoin de santé : {name}',
  'catalog.filters.chipLabel': 'Label : {name}',
  'catalog.filters.chipFacet': '{facet} : {value}',
  'catalog.filters.remove': 'Retirer le filtre {label}',
  'catalog.filters.clearAll': 'Tout effacer',
  'catalog.filters.option': '{label} ({count})',
  'catalog.filters.showFewer': 'Afficher moins d’options pour {label}',
  'catalog.filters.showMore': 'Afficher {count} de plus',
  'catalog.filters.priceRange': 'Prix : {min} - {max}',
  'catalog.filters.priceFrom': 'Prix : à partir de {min}',
  'catalog.filters.priceUpTo': 'Prix : jusqu’à {max}',
  'catalog.facet.pet': 'Animal',
  'catalog.facet.material': 'Matière',
  'catalog.facet.ageStage': 'Stade de vie',
  'catalog.facet.allAges': 'Tous âges',
  'catalog.facet.petDog': 'Chiens',
  'catalog.facet.petCat': 'Chats',
  'catalog.facet.petBird': 'Oiseaux',
  'catalog.facet.petFish': 'Poissons',
  'catalog.facet.petSmall': 'Petits animaux',
  'catalog.facet.petReptile': 'Reptiles',

  // Sort
  'catalog.sort.relevance': 'Pertinence',
  'catalog.sort.newest': 'Nouveautés',
  'catalog.sort.priceAsc': 'Prix croissant',
  'catalog.sort.priceDesc': 'Prix décroissant',
  'catalog.sort.unitPriceAsc': 'Prix unitaire le plus bas',
  'catalog.sort.name': 'Nom : de A à Z',

  // Price slider
  'catalog.price.title': 'Prix',
  'catalog.price.range': '{min} à {max}',
  'catalog.price.min': 'Prix minimum',
  'catalog.price.max': 'Prix maximum',

  // Gallery
  'catalog.gallery.noImage': 'Aucune image disponible',
  'catalog.gallery.images': 'Images du produit',
  'catalog.gallery.imageOf': 'Image {n} sur {total} : {alt}',

  // Pagination
  'catalog.pagination.label': 'Pagination',
  'catalog.pagination.prev': 'Préc.',
  'catalog.pagination.next': 'Suiv.',
  'catalog.pagination.page': 'Page {page}',

  // Pet tiles (names of the six pet categories)
  'catalog.petTile.dogs': 'Chiens',
  'catalog.petTile.cats': 'Chats',
  'catalog.petTile.birds': 'Oiseaux',
  'catalog.petTile.fish': 'Poissons',
  'catalog.petTile.smallPets': 'Petits animaux',
  'catalog.petTile.reptiles': 'Reptiles',

  // Product card
  'catalog.card.noImage': 'Pas d’image',
  'catalog.card.soldOut': 'Épuisé',
  'catalog.card.reviews': { one: '{count} avis', other: '{count} avis' },
  'catalog.card.coloursOf': 'Couleurs de {name}',
  'catalog.card.moreColours': { one: '+{count} couleur', other: '+{count} couleurs' },

  // Quantity stepper
  'catalog.quantity.label': 'Quantité',
  'catalog.quantity.labelOf': 'Quantité de {subject}',
  'catalog.quantity.decrease': 'Diminuer la quantité',
  'catalog.quantity.decreaseOf': 'Diminuer la quantité de {subject}',
  'catalog.quantity.increase': 'Augmenter la quantité',
  'catalog.quantity.increaseOf': 'Augmenter la quantité de {subject}',

  // Variant picker
  'catalog.variant.colour': 'Couleur',
  'catalog.variant.sizeXS': 'Très petit',
  'catalog.variant.sizeS': 'Petit',
  'catalog.variant.sizeM': 'Moyen',
  'catalog.variant.sizeL': 'Grand',
  'catalog.variant.sizeXL': 'Très grand',
  'catalog.variant.soldOut': '{label} (épuisé)',
  'catalog.variant.unavailable': '{label} (indisponible)',

  // Listing
  'catalog.list.loadError': 'Nous n’avons pas pu charger les produits.',
  'catalog.list.loadErrorHint': 'Vérifiez votre connexion et réessayez.',
  'catalog.list.tryAgain': 'Réessayer',
  'catalog.list.loading': 'Chargement des produits',
  'catalog.list.filters': 'Filtres',
  'catalog.list.filtersCount': 'Filtres ({count})',
  'catalog.list.none': 'Aucun produit',
  'catalog.list.showing': {
    one: '{first}-{last} sur {count} produit',
    other: '{first}-{last} sur {count} produits',
  },
  'catalog.list.showProducts': { one: 'Voir {count} produit', other: 'Voir {count} produits' },
  'catalog.list.sortBy': 'Trier par',
  'catalog.list.products': 'Produits',
  'catalog.empty.pageMissing': 'Cette page n’existe pas',
  'catalog.empty.pageMissingHint': 'Il n’y a pas autant de pages de résultats.',
  'catalog.empty.firstPage': 'Aller à la première page',
  'catalog.empty.noResults': 'Aucun résultat pour « {q} »',
  'catalog.empty.noMatch': 'Aucun produit ne correspond',
  'catalog.empty.removeFilter': 'Essayez de retirer un filtre pour en voir plus.',
  'catalog.empty.tryWords':
    'Essayez moins de mots, ou d’autres mots. La recherche porte sur des mots entiers, vérifiez donc l’orthographe.',
  'catalog.empty.nothingYet':
    'Il n’y a rien ici pour l’instant. Jetez un œil au rayon d’un autre animal en attendant notre réassort.',
  'catalog.empty.clearFilters': 'Effacer les filtres',

  // Pages
  'catalog.page.home': 'Accueil',
  'catalog.page.brands': 'Marques',
  'catalog.page.error': 'Une erreur est survenue',
  'catalog.page.tryAgain': 'Réessayer',
  'catalog.category.loadError': 'Nous n’avons pas pu charger cette catégorie',
  'catalog.category.loading': 'Chargement de la catégorie',
  'catalog.category.subcategories': 'Sous-catégories',
  'catalog.brand.loadError': 'Nous n’avons pas pu charger cette marque',
  'catalog.brand.loading': 'Chargement de la marque',
  'catalog.brands.description':
    'Les marques maison Pawsome : friandises, paniers, équipement pour terrariums et bien plus.',
  'catalog.brands.title': 'Nos marques',
  'catalog.brands.intro':
    'Six marques, une seule exigence : chaque produit est testé à la maison par notre jury d’animaux très difficiles avant d’arriver en boutique.',
  'catalog.brands.loadError': 'Nous n’avons pas pu charger les marques.',
  'catalog.collection.loadError': 'Nous n’avons pas pu charger cette collection',
  'catalog.collection.loading': 'Chargement de la collection',
  'catalog.collection.until': 'Jusqu’au {date}',

  // Messages from outside
  'msg.catalog.priceFormat': 'Saisissez un prix comme 12,50',
  'catalog.brands.shop': 'Voir la marque',
  'catalog.brand.storyTitle': 'Notre histoire',
};
