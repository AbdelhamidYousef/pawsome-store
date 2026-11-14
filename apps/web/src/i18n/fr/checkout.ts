import type { checkout as enNs } from '../en/checkout';
import type { Entry } from '../types';

export const checkout: Record<keyof typeof enNs, Entry> = {
  // ---------- page ----------
  'checkout.title': 'Paiement',
  'checkout.backToCart': 'Retour au panier',
  'checkout.loading': 'Chargement du paiement',
  'checkout.cartLoadError': 'Nous n’avons pas pu charger votre panier.',
  'checkout.tryAgain': 'Réessayer',
  'checkout.empty': 'Votre panier est vide, il n’y a donc encore rien à commander.',
  'checkout.continueShopping': 'Continuer vos achats',
  'checkout.soldOut': 'Un article de votre panier est épuisé. Retirez-le pour continuer.',
  'checkout.reviewCart': 'Vérifier votre panier',

  // ---------- step cards ----------
  'checkout.step.details': 'Contact et adresse',
  'checkout.step.shipping': 'Mode de livraison',
  'checkout.step.payment': 'Paiement',
  'checkout.step.edit': 'Modifier',
  'checkout.step.editAria': 'Modifier {title}',
  'checkout.step.editDetails': 'Modifier le contact et l’adresse',
  'checkout.step.editShipping': 'Modifier le mode de livraison',
  'checkout.step.vetSummary': 'Vétérinaire : {name}, {clinic}',

  // ---------- step 1: details ----------
  'checkout.details.haveAccount': 'Vous avez un compte ?',
  'checkout.details.signIn': 'Connectez-vous',
  'checkout.details.signInRest':
    'pour utiliser vos informations enregistrées. Ou continuez simplement en tant qu’invité.',
  'checkout.details.email': 'E-mail',
  'checkout.details.emailHint': 'Nous y envoyons la confirmation de votre commande.',
  'checkout.details.fullName': 'Nom complet',
  'checkout.details.line1': 'Adresse (ligne 1)',
  'checkout.details.line2': 'Adresse (ligne 2, facultatif)',
  'checkout.details.postalCode': 'Code postal',
  'checkout.details.city': 'Ville',
  'checkout.details.region': 'Région (facultatif)',
  'checkout.details.country': 'Pays',
  'checkout.details.countryHint': 'Nous livrons en Europe.',
  'checkout.details.phone': 'Téléphone (facultatif)',
  'checkout.details.phoneHint': 'Uniquement pour le livreur.',
  'checkout.details.saveAddress': 'Enregistrer cette adresse dans mon compte',
  'checkout.details.continue': 'Continuer vers la livraison',

  // ---------- vet ----------
  'checkout.vet.bannerTitle': 'Nécessite l’accord d’un vétérinaire.',
  'checkout.vet.bannerBody':
    'Après le paiement, nous mettons cette commande en attente jusqu’à l’approbation d’un vétérinaire, puis nous la préparons. Boutique de démonstration : ce n’est pas un vrai médicament et aucun vétérinaire n’est contacté.',
  'checkout.vet.legend': 'Votre vétérinaire',
  'checkout.vet.intro':
    'Un article de votre panier nécessite l’accord d’un vétérinaire avant que nous le préparions. Nous vous écrirons dès que la décision sera prise.',
  'checkout.vet.demo': 'La plupart des demandes sont validées sous un jour ouvré.',
  'checkout.vet.name': 'Nom du vétérinaire',
  'checkout.vet.clinic': 'Clinique',
  'checkout.vet.email': 'E-mail du vétérinaire',

  // ---------- step 2: shipping ----------
  'checkout.shipping.loading': 'Chargement des options de livraison',
  'checkout.shipping.loadError': 'Nous n’avons pas pu charger les options de livraison.',
  'checkout.shipping.none':
    'Nous ne pouvons pas livrer cette commande dans ce pays pour le moment.',
  'checkout.shipping.legend': 'Mode de livraison',
  'checkout.shipping.etaSame': {
    one: '{count} jour ouvré',
    other: '{count} jours ouvrés',
  },
  'checkout.shipping.etaRange': {
    one: '{min}-{max} jours ouvrés',
    other: '{min}-{max} jours ouvrés',
  },
  'checkout.shipping.free': 'Gratuit',
  'checkout.shipping.continue': 'Continuer vers le paiement',
  'checkout.shipping.tryAgain': 'Réessayer',
  'checkout.roundUp.label': 'Arrondir mon total à l’euro supérieur pour Whisker Hollow Rescue',
  'checkout.roundUp.hint':
    'Les centimes en plus apparaissent sur une ligne distincte de votre commande.',

  // ---------- step 3: payment ----------
  'checkout.payment.pay': 'Payer {amount}',
  'checkout.payment.testMode':
    'Mode test : utilisez la carte 4242 4242 4242 4242, une date d’expiration future et un cryptogramme quelconque. Aucun argent réel ne circule.',
  'checkout.payment.notConfiguredTitle':
    'Les paiements ne sont pas configurés dans cet environnement',
  'checkout.payment.notConfiguredBody':
    'Le paiement par carte n’est pas encore activé dans cette version de la boutique : aucune commande ne peut donc y être passée. Tout ce qui précède cette étape fonctionne normalement.',
  'checkout.payment.preparing': 'Préparation de votre paiement…',
  'checkout.payment.loadFailedTitle':
    'Nous n’avons pas pu charger le formulaire de paiement sécurisé',
  'checkout.payment.loadFailedBody':
    'Rien n’a été débité et votre commande est enregistrée. Vérifiez votre connexion (un bloqueur de publicités ou de scripts peut aussi empêcher le formulaire Stripe de se charger), puis réessayez.',
  'checkout.payment.tryAgain': 'Réessayer',
  'checkout.payment.failed':
    'Un problème est survenu lors du paiement. Vous n’avez pas été débité ; veuillez réessayer.',
  'checkout.payment.unreachable':
    'Nous n’avons pas pu joindre le prestataire de paiement. Vérifiez votre connexion et réessayez.',

  // ---------- summary ----------
  'checkout.summary.aria': 'Récapitulatif de la commande',
  'checkout.summary.title': 'Récapitulatif de la commande',
  'checkout.summary.codeBack': 'Retour au panier pour modifier le code',
  'checkout.summary.itemsRegion': 'Articles de votre commande ({count}), défilement possible',
  'checkout.summary.qty': 'Qté {quantity}',
  'checkout.summary.subtotal': 'Sous-total',
  'checkout.summary.shipping': 'Livraison',
  'checkout.summary.shippingNext': 'Étape suivante',
  'checkout.summary.discount': 'Réduction',
  'checkout.summary.donation': 'Don',
  'checkout.summary.tax': 'TVA',
  'checkout.summary.free': 'Gratuit',
  'checkout.summary.total': 'Total',
  'checkout.summary.totalPending': 'Confirmé au paiement',
  'checkout.address.shippingTo': 'Livraison à',

  // ---------- errors from placing the order ----------
  'checkout.error.cartChanged':
    'Quelque chose a changé dans votre panier pendant votre commande (un article épuisé ou un prix modifié). Nous avons actualisé votre récapitulatif ; veuillez le vérifier et continuer.',
  'checkout.error.paymentProvider':
    'Notre prestataire de paiement rencontre des difficultés en ce moment. Vous n’avez pas été débité ; veuillez réessayer dans un instant.',

  // ---------- confirmation ----------
  'checkout.confirmation.seoTitle': 'Confirmation de commande',
  'checkout.confirmation.order': 'Commande',
  'checkout.confirmation.pending.title': 'Confirmation de votre paiement…',
  'checkout.confirmation.pending.body':
    'Cela ne prend généralement que quelques secondes. Veuillez garder cette page ouverte.',
  'checkout.confirmation.paid.title': 'Merci, votre commande est payée !',
  'checkout.confirmation.paid.body': 'Un e-mail de confirmation est en route.',
  'checkout.confirmation.timeout.title': 'Nous confirmons encore votre paiement',
  'checkout.confirmation.timeout.body':
    'Cela prend plus de temps que d’habitude, ce qui peut arriver quand le prestataire de paiement tarde à nous répondre. Merci de ne pas payer une seconde fois. Inutile d’attendre ici : vous recevrez un e-mail dès que le paiement sera confirmé, et vous pouvez revenir sur cette page pour vérifier.',
  'checkout.confirmation.failed.title': 'Votre paiement n’a pas abouti',
  'checkout.confirmation.failed.body':
    'Vous n’avez pas été débité. Votre panier est toujours là, vous pouvez donc réessayer.',
  'checkout.confirmation.cancelled.title': 'Cette commande a été annulée',
  'checkout.confirmation.cancelled.body': 'Si vous avez payé, le remboursement est en cours.',
  'checkout.confirmation.notFound.title': 'Nous ne trouvons pas cette commande ici',
  'checkout.confirmation.notFound.body':
    'Une commande ne peut être ouverte que depuis le navigateur ou le compte qui l’a passée.',
  'checkout.confirmation.error.title': 'Nous n’avons pas pu vérifier votre commande',
  'checkout.confirmation.error.body':
    'Le serveur n’a pas répondu. Votre paiement n’est pas affecté.',
  'checkout.confirmation.waking':
    'Notre serveur se réveille après une sieste : la première réponse peut prendre jusqu’à une minute. Patientez un instant, votre commande est en sécurité.',
  'checkout.confirmation.tryAgain': 'Réessayer',
  'checkout.confirmation.checkAgain': 'Vérifier à nouveau',
  'checkout.confirmation.continueShopping': 'Continuer vos achats',
  'checkout.confirmation.yourOrder': 'Votre commande',
  'checkout.confirmation.delivery': 'Livraison',
  'checkout.confirmation.shippingMethod': 'Mode de livraison',
  'checkout.confirmation.contact': 'Contact',

  // ---------- messages from outside (Zod rules in @store/shared) ----------
  'msg.checkout.required': 'Obligatoire',
  'msg.checkout.emailInvalid': 'Adresse e-mail invalide',
  'msg.checkout.vetName': 'Saisissez le nom du vétérinaire',
  'msg.checkout.vetClinic': 'Saisissez la clinique',
  'msg.checkout.countryUnsupported': 'Nous ne livrons pas dans ce pays',
};
