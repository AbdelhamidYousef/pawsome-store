import type { cart as enNs } from '../en/cart';
import type { Entry } from '../types';

export const cart: Record<keyof typeof enNs, Entry> = {
  // ---------- page ----------
  'cart.title': 'Votre panier',
  'cart.loading': 'Chargement de votre panier',
  'cart.loadError': 'Nous n’avons pas pu charger votre panier.',
  'cart.tryAgain': 'Réessayer',
  'cart.empty.page':
    'Votre panier est vide. Il est temps de trouver de quoi faire remuer la queue !',
  'cart.empty.drawer': 'Votre panier est vide.',
  'cart.continueShopping': 'Continuer vos achats',
  'cart.summary.aria': 'Récapitulatif de la commande',
  'cart.items.aria': 'Articles de votre panier',

  // ---------- drawer ----------
  'cart.drawer.loadErrorRetry': 'Nous n’avons pas pu charger votre panier. Réessayer',
  'cart.drawer.viewCart': 'Voir le panier',
  'cart.mightNeed.title': 'Pensez aussi à',
  'cart.mightNeed.add': 'Ajouter',
  'cart.mightNeed.addAria': 'Ajouter {name}',

  // ---------- lines ----------
  'cart.line.each': '{price} l’unité',
  'cart.line.eachSr': 'l’unité',
  'cart.line.memberPrice': 'Prix membre',
  'cart.line.soldOut': 'Épuisé',
  'cart.line.soldOutNote': 'Non inclus dans votre total. Retirez-le pour passer commande.',
  'cart.line.maxAvailable': 'Maximum disponible',
  'cart.line.remove': 'Retirer',
  'cart.line.removeAria': 'Retirer {name}',
  'cart.line.ok': 'OK',
  'cart.line.okDismiss': ', fermer l’avis concernant {name}',
  'cart.gift.label': 'Cadeau offert',

  // ---------- notices ----------
  'cart.notice.dismiss': 'Fermer',
  'cart.notice.dismissAbout': 'l’avis concernant {name}',
  'cart.notice.qtyReducedNoDetail': 'Stock insuffisant, nous avons donc réduit la quantité.',
  'cart.notice.qtyReduced':
    'Seulement {quantity} disponible(s), nous avons donc réduit la quantité.',
  'cart.notice.qtyReducedFrom':
    'Seulement {quantity} disponible(s), nous avons donc réduit la quantité de {previous}.',
  'cart.notice.priceChanged': 'Le prix est passé de {from} à {to}.',
  'cart.notice.priceChangedNoDetail': 'Le prix de cet article a changé.',
  'cart.notice.unavailable':
    '{product} ({variant}) n’est plus disponible et a été retiré de votre panier.',
  'cart.notice.changed': 'Quelque chose a changé pour {product} ({variant}).',

  // ---------- summary ----------
  'cart.summary.subtotal': 'Sous-total',
  'cart.summary.discountsApplied': 'Réductions appliquées',
  'cart.summary.freeDelivery': 'Livraison offerte',
  'cart.summary.shippingEstimate': 'Livraison (estimation, standard)',
  'cart.summary.free': 'Gratuit',
  'cart.summary.estimatedTotal': 'Total estimé',
  'cart.summary.noTax': 'Prix TTC, TVA incluse le cas échéant.',
  'cart.summary.checkout': 'Passer commande',
  'cart.summary.soldOutBlock': 'Retirez les articles épuisés pour continuer.',

  // ---------- progress bars ----------
  'cart.progress.giftLabel': 'Progression vers un cadeau offert',
  'cart.progress.giftReached': 'Vous recevez un cadeau offert !',
  'cart.progress.giftRemaining': 'Dépensez encore {amount} pour un cadeau offert',
  'cart.progress.shippingLabel': 'Progression vers la livraison gratuite',
  'cart.progress.shippingReached': 'Vous bénéficiez de la livraison standard gratuite.',
  'cart.progress.shippingRemaining': 'Ajoutez encore {amount} pour la livraison standard gratuite.',

  // ---------- discount code ----------
  'cart.code.label': 'Code de réduction',
  'cart.code.apply': 'Appliquer',
  'cart.code.remove': 'Retirer',
  'cart.code.removeAria': 'Retirer le code {code}',
  'cart.code.invalid': 'Saisissez un code valide',
  'cart.code.fallbackName': 'votre code',

  // ---------- promotion sentences ----------
  'cart.promo.unknown': 'Nous n’avons pas trouvé le code {code}.',
  'cart.promo.usedUp': '{code} a été entièrement utilisé.',
  'cart.promo.alreadyUsed': 'Vous avez déjà utilisé {code}.',
  'cart.promo.notStarted': '{code} n’est pas encore actif.',
  'cart.promo.expired': '{code} a expiré.',
  'cart.promo.minSpend': 'Ajoutez encore {amount} pour utiliser {code}.',
  'cart.promo.noEligibleItems':
    '{code} ne s’applique à aucun article de votre panier pour le moment.',
  'cart.promo.firstOrderOnly': '{code} est réservé aux premières commandes.',
  'cart.promo.notStackable':
    'Votre {tier} vous fait économiser plus que {code}, nous l’avons donc utilisé.',
  'cart.promo.bulkFallback': 'remise sur quantité',
  'cart.promo.creditCapped':
    'Votre crédit a été plafonné pour que vous payiez au moins 0,50 (le minimum par carte).',

  // ---------- how discounts combine ----------
  'cart.rules.title': 'Comment les réductions se combinent',
  'cart.rules.bestPrice':
    'Chaque article bénéficie de son meilleur prix unique : prix normal, prix soldé ou prix membre. Les prix ne se cumulent jamais entre eux.',
  'cart.rules.orderDiscount':
    'Ensuite, une seule réduction sur la commande : une remise sur quantité ou un code, selon ce qui vous fait le plus économiser. Jamais les deux. Les codes peuvent exclure les articles déjà en promotion.',
  'cart.rules.gift':
    'Un cadeau offert est ajouté dès que vos articles, après cette réduction, atteignent le seuil du cadeau.',
  'cart.rules.delivery':
    'La livraison est gratuite au-delà du seuil de livraison ou avec un code de livraison offerte. Les codes de livraison offerte se combinent avec tout le reste.',
  'cart.rules.credits':
    'Les crédits passent en dernier. Ils ne paient jamais la livraison, et votre total ne descend jamais sous zéro.',

  // ---------- toasts and errors ----------
  'cart.toast.removed': '{name} retiré de votre panier',
  'cart.toast.added': '{quantity} x {name} ajouté(s) à votre panier',
  'cart.toast.addedMany': {
    one: '{count} article ajouté à votre panier',
    other: '{count} articles ajoutés à votre panier',
  },
  'cart.toast.viewCart': 'Voir le panier',
  'cart.error.soldOut': 'Désolé, cet article vient d’être épuisé.',
  'cart.error.haveAll': 'Vous avez déjà dans votre panier les {max} que nous pouvons proposer.',
  'cart.error.only': 'Seulement {max} disponible(s).',
  'cart.error.onlyWithCart':
    'Seulement {max} disponible(s), et vous en avez {inCart} dans votre panier.',

  // ---------- messages from outside (Zod rules in @store/shared) ----------
  'msg.cart.codeRequired': 'Saisissez un code',
  'msg.cart.codeChars': 'Les codes ne contiennent que des lettres et des chiffres',
};
