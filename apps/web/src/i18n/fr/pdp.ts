import type { pdp as enNs } from '../en/pdp';
import type { Entry } from '../types';

export const pdp: Record<keyof typeof enNs, Entry> = {
  // ---- product page ----
  'pdp.page.home': 'Accueil',
  'pdp.page.loadError.seoTitle': 'Une erreur est survenue',
  'pdp.page.loadError.title': 'Nous n’avons pas pu charger ce produit',
  'pdp.page.loadError.retry': 'Réessayer',
  'pdp.page.loading': 'Chargement du produit',
  'pdp.page.reviewCount': { one: '{count} avis', other: '{count} avis' },
  'pdp.page.soldOut': 'Épuisé',
  'pdp.page.inStock': 'En stock',
  'pdp.page.sku': 'Réf. {sku}',
  'pdp.page.trialSize': 'Format d’essai',
  'pdp.page.trialNote':
    'Un échantillon à essayer avant de vous décider : un par client. Le grand format n’est pas limité.',
  'pdp.page.attr.pet': 'Animal',
  'pdp.page.attr.material': 'Matière',
  'pdp.page.attr.ageStage': 'Stade de vie',
  'pdp.page.attr.size': 'Taille',
  'pdp.page.attr.brand': 'Marque',
  'pdp.page.attr.goodFor': 'Idéal pour',
  'pdp.page.gallery.heading': 'Clients avec ce produit',
  'pdp.page.gallery.intro':
    'Photos de vrais animaux Pawsome. Touchez-en une pour acheter ce qu’on y voit.',

  // ---- tabs ----
  'pdp.tabs.label': 'Informations sur le produit',
  'pdp.tabs.description': 'Description',
  'pdp.tabs.specs': 'Caractéristiques',
  'pdp.tabs.feeding': 'Guide d’alimentation',
  'pdp.tabs.delivery': 'Livraison et retours',

  // ---- specs ----
  'pdp.specs.heading': 'Caractéristiques',
  'pdp.specs.analysis': 'Analyse garantie',
  'pdp.specs.per100': 'Pour 100 g.',
  'pdp.specs.per100Variant': 'Pour 100 g, {variant}.',
  'pdp.specs.constituent.protein': 'Protéines',
  'pdp.specs.constituent.fat': 'Matières grasses',
  'pdp.specs.constituent.fibre': 'Fibres',
  'pdp.specs.constituent.ash': 'Cendres',
  'pdp.specs.constituent.moisture': 'Humidité',
  'pdp.specs.constituent.kcal': 'Énergie',
  'pdp.specs.kcal': '{value} kcal',
  'pdp.specs.percent': '{value} %',

  // ---- FAQ ----
  'pdp.faq.heading': 'Questions et réponses',

  // ---- feeding ----
  'pdp.feeding.stage.any': 'Tous les stades de vie',
  'pdp.feeding.stage.puppy': 'Chiot ou chaton',
  'pdp.feeding.stage.adult': 'Adulte',
  'pdp.feeding.stage.senior': 'Senior',
  'pdp.feeding.table.caption':
    'Quantité quotidienne selon le poids de l’animal. À titre indicatif.',
  'pdp.feeding.table.stage': 'Stade de vie',
  'pdp.feeding.table.weight': 'Poids de l’animal',
  'pdp.feeding.table.perDay': 'Par jour',
  'pdp.feeding.table.weightRange': '{from} à {to} kg',
  'pdp.feeding.heading': 'Quelle quantité donner ?',
  'pdp.feeding.weightLabel': 'Poids de l’animal (kg)',
  'pdp.feeding.stageLabel': 'Stade de vie',
  'pdp.feeding.mealsLabel': 'Repas par jour',
  'pdp.feeding.sliderLabel': 'Curseur du poids de l’animal',
  'pdp.feeding.invalidWeight': 'Saisissez le poids de votre animal en kg, par exemple 7,5.',
  'pdp.feeding.daily.1': 'Environ {daily} par jour, un repas',
  'pdp.feeding.daily.2': 'Environ {daily} par jour, deux repas de {portion}',
  'pdp.feeding.daily.3': 'Environ {daily} par jour, trois repas de {portion}',
  'pdp.feeding.daily.4': 'Environ {daily} par jour, quatre repas de {portion}',
  'pdp.feeding.clampBelow':
    'Notre guide commence à {from} kg : voici donc la quantité pour {from} kg. Demandez conseil à votre vétérinaire pour un animal aussi léger.',
  'pdp.feeding.clampAbove':
    'Notre guide s’arrête à {to} kg : voici donc la quantité pour {last} kg. Demandez conseil à votre vétérinaire pour un animal aussi lourd.',
  'pdp.feeding.bagLessThanDay': 'Ce sac ne suffit pas pour une journée.',
  'pdp.feeding.bagLasts': {
    one: 'Ce sac dure environ {count} jour, soit environ {price} par jour.',
    other: 'Ce sac dure environ {count} jours, soit environ {price} par jour.',
  },
  'pdp.feeding.pickMonth': 'Choisissez le format de sac qui dure un mois',
  'pdp.feeding.pickMonthNote': {
    one: '{name} : environ {count} jour.',
    other: '{name} : environ {count} jours.',
  },
  'pdp.feeding.alreadyMonth': 'Ce format dure déjà un mois ou plus.',
  'pdp.feeding.disclaimer':
    'Un guide, pas un avis vétérinaire. Chaque animal est différent : demandez conseil à votre vétérinaire si votre animal est malade, gestant, très jeune ou très âgé.',
  'pdp.feeding.rangeKg': '{value} kg',

  // ---- delivery panel ----
  'pdp.delivery.heading': 'Livraison',
  'pdp.delivery.shipIntro':
    'Les commandes partent de notre entrepôt les jours ouvrés. Vous choisissez la livraison standard ou express au paiement et voyez le prix exact avant de payer. Consultez la page',
  'pdp.delivery.shipLink': 'expédition',
  'pdp.delivery.shipOutro': 'pour les prix et les délais.',
  'pdp.delivery.cutoffNote':
    'Les commandes passées avant 15 h (heure d’Amsterdam) un jour ouvré sont expédiées le jour même. Le calendrier d’expédition et la liste des jours fériés sont inventés pour cette boutique de démonstration.',
  'pdp.delivery.returnsHeading': 'Retours',
  'pdp.delivery.returnsIntro':
    'Vous avez changé d’avis ? Les articles non utilisés dans leur emballage d’origine peuvent être retournés sous 30 jours. Les aliments ouverts et les articles d’hygiène ne peuvent pas être retournés, sauf s’ils sont défectueux. Voir',
  'pdp.delivery.returnsLink': 'retours et rétractation',

  // ---- delivery estimate ----
  'pdp.estimate.orderIn': 'Commandez dans {countdown}, livraison {range}',
  'pdp.estimate.orderNow': 'Commandez maintenant, expédition {day}, livraison {range}',
  'pdp.estimate.methodArrives': '{method} : livraison {range}',
  'pdp.estimate.methodArrivesSpoken': '{method} : livraison {range}.',
  'pdp.estimate.range': '{from} à {to}',
  'pdp.estimate.spoken':
    'Commandez avant {time} un jour ouvré et votre commande est expédiée le jour même.',
  'pdp.estimate.cutoffNote': 'Heure limite : {time}, heure d’Amsterdam, du lundi au vendredi.',
  'pdp.estimate.countdownHm': '{h} h {m} min',
  'pdp.estimate.countdownM': '{m} min',
  'pdp.estimate.countdownUnderMinute': 'moins d’une minute',

  // ---- size guide ----
  'pdp.size.button': 'Guide des tailles',
  'pdp.size.sizeColumn': 'Taille',
  'pdp.size.yourSize': '(votre taille)',
  'pdp.size.howToMeasure': 'Comment mesurer',
  'pdp.size.measure.neck': 'Cou',
  'pdp.size.measure.chest': 'Poitrine',
  'pdp.size.measure.length': 'Longueur',

  // ---- bought together ----
  'pdp.bought.heading': 'Souvent achetés ensemble',
  'pdp.bought.thisItem': 'Cet article :',
  'pdp.bought.notAvailable': '(indisponible)',
  'pdp.bought.withVariant': '{name} ({variant})',
  'pdp.bought.view': 'Voir',
  'pdp.bought.viewLabel': 'Voir {name}',
  'pdp.bought.anItem': 'Un article',
  'pdp.bought.problem': '{name} : {message}',
  'pdp.bought.total': 'Total',
  'pdp.bought.beforeDiscounts': 'Avant remises éventuelles.',
  'pdp.bought.addAll': 'Tout ajouter',
  'pdp.bought.addAllCount': {
    one: 'Tout ajouter ({count} article)',
    other: 'Tout ajouter ({count} articles)',
  },

  // ---- bundles and kits ----
  'pdp.bundle.heading': 'Contenu du kit',
  'pdp.bundle.qtyLine': '{qty} x {name}',
  'pdp.bundle.saving': 'Économisez {saving} par rapport à l’achat séparé ({individual})',
  'pdp.kits.heading': 'En faire un kit',
  'pdp.kits.save': 'Économisez {saving}',

  // ---- rails ----
  'pdp.related.heading': 'Vous aimerez aussi',
  'pdp.related.label': 'Produits similaires',
  'pdp.recent.heading': 'Récemment consultés',
  'pdp.rail.prev': 'Produits précédents',
  'pdp.rail.next': 'Produits suivants',
};
