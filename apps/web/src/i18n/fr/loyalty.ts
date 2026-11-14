import type { loyalty as enNs } from '../en/loyalty';
import type { Entry } from '../types';

export const loyalty: Record<keyof typeof enNs, Entry> = {
  // Checkout: pay with points
  'loyalty.redeem.title': 'Utiliser mes points de fidélité',
  'loyalty.redeem.balance': 'Vous avez {balance} points (valeur : {worth}).',
  'loyalty.redeem.rate': '100 points = {amount} de réduction sur vos articles.',
  'loyalty.redeem.minimum': 'Vous payez toujours au moins {amount} par carte.',
  'loyalty.redeem.useMax': 'Utiliser le maximum ({max})',
  'loyalty.redeem.clear': 'Effacer',
  'loyalty.redeem.applied': '{points} points = {amount} de réduction',

  // Earn points (product page, cart)
  'loyalty.earn.signInLink': 'Connectez-vous pour gagner',
  'loyalty.earn.signInRest': 'des points de fidélité sur cette commande.',
  'loyalty.earn.points': {
    one: 'Gagnez {count} point',
    other: 'Gagnez {count} points',
  },

  // Footer note and charity page
  'loyalty.charityNote.text': 'a reçu {amount} de la part des clients Pawsome jusqu’ici.',
  'loyalty.charity.seoTitle': 'Notre refuge',
  'loyalty.charity.seoDescription':
    'Whisker Hollow Rescue est le refuge que Pawsome soutient. Arrondissez votre total au paiement ou offrez vos points.',
  'loyalty.charity.note':
    'Chaque arrondi au paiement et chaque point offert s’ajoutent au total ci-dessous.',
  'loyalty.charity.error': 'Nous n’avons pas pu charger le total pour le moment.',
  'loyalty.charity.given': 'Total des dons',
  'loyalty.charity.donations': { one: 'grâce à {count} don', other: 'grâce à {count} dons' },
  'loyalty.charity.waysTitle': 'Deux façons de donner',
  'loyalty.charity.checkoutLabel': 'Au paiement :',
  'loyalty.charity.checkoutText':
    'cochez « arrondir » et le total passe à l’euro supérieur. La différence apparaît sur une ligne distincte de votre commande et n’est jamais remisée.',
  'loyalty.charity.pointsLabel': 'Avec des points :',
  'loyalty.charity.pointsText':
    'donnez autant de points de fidélité que vous voulez (1 point = 1 centime)',
  'loyalty.charity.pointsOnYour': 'sur votre',
  'loyalty.charity.rewardsPage': 'page de récompenses',
  'loyalty.charity.pointsOnceYou': 'une fois que vous vous',
  'loyalty.charity.signIn': 'connectez',
  'loyalty.charity.roundUpNote':
    'Un arrondi est comptabilisé lorsque la commande est payée et annulé si la commande est remboursée.',

  // Referral panel
  'loyalty.referral.title': 'Parrainer un ami',
  'loyalty.referral.how':
    'Partagez votre lien. Lorsqu’un ami crée un compte et règle sa première commande de {min} ou plus, vous recevez tous les deux un code de {reward} (valable {days} jours, pour une commande de {min} ou plus).',
  'loyalty.referral.copy': 'Copier le lien',
  'loyalty.referral.copied': 'Copié',
  'loyalty.referral.linkCopied': 'Lien copié',
  'loyalty.referral.stats':
    'Récompensés : {qualified}, en attente d’une première commande : {pending}. Jusqu’à {max} par an.',
  'loyalty.referral.statsRejected':
    'Récompensés : {qualified}, en attente d’une première commande : {pending}, non éligibles : {rejected}. Jusqu’à {max} par an.',

  // /account/rewards
  'loyalty.rewards.title': 'Récompenses',
  'loyalty.rewards.pointsError': 'Nous n’avons pas pu charger vos points.',
  'loyalty.rewards.retry': 'Réessayer',
  'loyalty.rewards.balance': 'Votre solde',
  'loyalty.rewards.pointsUnit': 'points',
  'loyalty.rewards.worth': 'Soit {amount} au paiement',
  'loyalty.rewards.earnRateOne': 'Vous gagnez 1 point par euro dépensé.',
  'loyalty.rewards.earnRatePercent': 'Vous gagnez {percent} % par euro dépensé.',
  'loyalty.rewards.nextTier': 'Encore {points} points gagnés pour atteindre {label}.',
  'loyalty.rewards.topTier': 'Vous êtes au niveau le plus élevé. Bravo, bon toutou !',
  'loyalty.rewards.spendTitle': 'Dépenser vos points',
  'loyalty.rewards.rewardsError': 'Nous n’avons pas pu charger les récompenses.',
  'loyalty.rewards.noRewards': 'Aucune récompense n’est disponible pour le moment.',
  'loyalty.rewards.cost': '{points} points',
  'loyalty.rewards.redeem.button': 'Échanger',
  'loyalty.rewards.redeem.morePoints': 'Encore {short} points',
  'loyalty.rewards.redeem.for': 'pour {name}',
  'loyalty.rewards.redeem.code': 'Votre code est {code}',
  'loyalty.rewards.redeem.failed': 'Nous n’avons pas pu effectuer cet échange.',
  'loyalty.rewards.giveAwayTitle': 'Ou les offrir',
  'loyalty.rewards.donate.giveTo': 'Donner des points à',
  'loyalty.rewards.donate.aboutShelter': ', le refuge que nous soutenons (1 point = 1 centime).',
  'loyalty.rewards.donate.label': 'Points à donner',
  'loyalty.rewards.donate.button': 'Donner',
  'loyalty.rewards.donate.thanks': 'Merci ! {points} points sont allés au refuge.',
  'loyalty.rewards.donate.failed': 'Nous n’avons pas pu enregistrer ce don.',
  'loyalty.rewards.codesTitle': 'Vos codes',
  'loyalty.rewards.codesEmpty':
    'Les codes achetés avec des points apparaissent ici. Appliquez-en un dans votre panier.',
  'loyalty.rewards.code.freeDelivery': 'Livraison offerte',
  'loyalty.rewards.code.fixedOff': '{amount} de réduction',
  'loyalty.rewards.code.percentOff': '{percent} % de réduction',
  'loyalty.rewards.code.minSpend': ', achat minimum de {amount}',
  'loyalty.rewards.code.used': 'Utilisé',
  'loyalty.rewards.code.validUntil': 'Valable jusqu’au {date}',
  'loyalty.rewards.code.noExpiry': 'Sans date d’expiration',
  'loyalty.rewards.historyTitle': 'Historique des points',
  'loyalty.rewards.historyEmpty':
    'Aucun point pour le moment. Chaque euro dépensé sur une commande vous rapporte des points.',
  'loyalty.rewards.historyCaption': 'Vos 50 derniers mouvements de points',
  'loyalty.rewards.colDate': 'Date',
  'loyalty.rewards.colWhat': 'Opération',
  'loyalty.rewards.colPoints': 'Points',
  'loyalty.rewards.kind.earn': 'Gagnés',
  'loyalty.rewards.kind.redeem': 'Dépensés',
  'loyalty.rewards.kind.reversal': 'Restitués ou annulés',
  'loyalty.rewards.kind.bonus': 'Bonus',
  'loyalty.rewards.kind.donate': 'Donnés',
  'loyalty.rewards.kind.adjust': 'Ajustement',

  // Wishlist
  'loyalty.wishlist.title': 'Votre liste de souhaits',
  'loyalty.wishlist.saveLabel': 'Ajouter {name} à la liste de souhaits',
  'loyalty.wishlist.saved': '{name} a été ajouté à votre liste de souhaits',
  'loyalty.wishlist.updateFailed':
    'Nous n’avons pas pu mettre à jour votre liste de souhaits. Veuillez réessayer.',
  'loyalty.wishlist.moveToCart': 'Ajouter au panier',
  'loyalty.wishlist.soldOut': 'Épuisé',
  'loyalty.wishlist.remove': 'Retirer',
  'loyalty.wishlist.error': 'Nous n’avons pas pu charger votre liste de souhaits pour le moment.',
  'loyalty.wishlist.empty':
    'Rien d’enregistré pour l’instant. Touchez le cœur sur un produit pour le garder ici.',
  'loyalty.wishlist.keepBrowsing': 'Continuer à explorer',
  'loyalty.wishlist.shareTitle': 'Partager votre liste de souhaits',
  'loyalty.wishlist.shareText':
    'Toute personne disposant du lien voit ces articles et votre prénom, rien d’autre. Si vous désactivez le partage, le lien cesse de fonctionner.',
  'loyalty.wishlist.stopSharing': 'Arrêter le partage',
  'loyalty.wishlist.createLink': 'Créer un lien de partage',
  'loyalty.wishlist.signIn': 'Connectez-vous',
  'loyalty.wishlist.signInRest':
    'pour partager votre liste. Vos articles enregistrés vous suivent.',
  'loyalty.wishlist.sharedTitle': 'Une liste de souhaits partagée',
  'loyalty.wishlist.ownerTitle': 'Liste de souhaits de {name}',
  'loyalty.wishlist.sharedEmpty': 'Rien dans cette liste pour le moment.',

  // Newsletter
  'loyalty.newsletter.seoTitle': 'Newsletter',
  'loyalty.newsletter.seoDescription': 'Conseils pour vos animaux et offres de Pawsome.',
  'loyalty.newsletter.pageTitle': 'Rejoignez la meute',
  'loyalty.newsletter.pageText':
    'Abonnez-vous et profitez de 10 % de réduction sur votre première commande dès que vous avez confirmé votre adresse.',
  'loyalty.newsletter.slotTitle':
    'Rejoignez la meute : 10 % de réduction sur votre première commande',
  'loyalty.newsletter.slotText':
    'Des conseils pour vos animaux et, de temps en temps, une offre. Nous envoyons d’abord un lien de confirmation, et chaque message contient un lien de désabonnement en un clic. Consultez la',
  'loyalty.newsletter.privacyLink': 'politique de confidentialité',
  'loyalty.newsletter.email': 'E-mail',
  'loyalty.newsletter.pets': 'Quels animaux avez-vous ?',
  'loyalty.newsletter.consent':
    'Je souhaite recevoir les actualités, offres et conseils de Pawsome pour mes animaux. Je peux me désabonner en un clic à tout moment.',
  'loyalty.newsletter.consentRequired': 'Veuillez cocher la case pour vous abonner',
  'loyalty.newsletter.honeypot': 'Laissez ce champ vide',
  'loyalty.newsletter.submit': 'S’abonner et profiter de -10 %',
  'loyalty.newsletter.done':
    'Presque terminé ! Si cette adresse peut recevoir nos e-mails, un lien de confirmation est en route. Cliquez dessus et votre code de bienvenue suivra.',
  'loyalty.newsletter.tooMany':
    'Trop d’inscriptions depuis cette connexion. Veuillez réessayer plus tard.',
  'loyalty.newsletter.failed':
    'Nous n’avons pas pu vous inscrire pour le moment. Veuillez réessayer dans un instant.',
  'loyalty.newsletter.token.incomplete':
    'Ce lien est incomplet. Veuillez le rouvrir depuis l’e-mail.',
  'loyalty.newsletter.token.working': 'Traitement en cours',
  'loyalty.newsletter.token.expired': 'Ce lien a expiré.',
  'loyalty.newsletter.token.invalid': 'Ce lien n’est plus valide.',
  'loyalty.newsletter.token.signUpAgain': 'S’inscrire à nouveau',
  'loyalty.newsletter.confirm.title': 'Confirmer votre abonnement',
  'loyalty.newsletter.confirm.already':
    'Vous êtes déjà abonné. Votre code de bienvenue figure dans l’e-mail que nous vous avons envoyé.',
  'loyalty.newsletter.confirm.done':
    'Vous êtes abonné ! Nous venons de vous envoyer par e-mail votre code de bienvenue de 10 %.',
  'loyalty.newsletter.unsubscribe.title': 'Se désabonner',
  'loyalty.newsletter.unsubscribe.done':
    'Vous êtes désabonné. Nous ne vous enverrons plus d’actualités.',

  // Stock alerts
  'loyalty.stockAlerts.title': 'M’avertir du retour en stock',
  'loyalty.stockAlerts.email': 'E-mail',
  'loyalty.stockAlerts.submit': 'M’avertir du retour',
  'loyalty.stockAlerts.done':
    'C’est noté. Nous écrirons une seule fois à {email}, dès que l’article sera de retour.',
  'loyalty.stockAlerts.inStock': 'L’article est en stock actuellement : actualisez la page.',
  'loyalty.stockAlerts.limit': 'Vous pouvez suivre 5 articles au maximum à la fois.',
  'loyalty.stockAlerts.tooMany': 'Trop de demandes. Veuillez réessayer plus tard.',
  'loyalty.stockAlerts.failed':
    'Nous n’avons pas pu enregistrer cette demande. Veuillez réessayer.',
  'loyalty.stockAlerts.cancel.title': 'Alerte de stock',
  'loyalty.stockAlerts.cancel.done':
    'C’est fait : nous ne vous écrirons plus au sujet de cet article.',

  // Messages from outside (shared Zod rules)
  'msg.loyalty.emailInvalid': 'Saisissez une adresse e-mail valide',
  'loyalty.newsletter.perkTips': 'Des conseils pour les animaux que vous choisissez',
  'loyalty.newsletter.perkNew': 'Les nouveaux jouets et friandises en avant-première',
  'loyalty.newsletter.perkEasy': 'Désabonnement en un clic, à tout moment',
};
