import type { demo as enNs } from '../en/demo';
import type { Entry } from '../types';

export const demo: Record<keyof typeof enNs, Entry> = {
  'demo.badge': 'Boutique test',
  'demo.title': 'Assistant démo',
  'demo.intro':
    'Pas besoin de tout taper : un clic remplit ce formulaire avec des données fictives.',
  'demo.collapse': 'Réduire',
  'demo.expand': 'Assistant démo : remplir ce formulaire',
  'demo.close': 'Fermer l’assistant démo',
  'demo.copy': 'Copier',
  'demo.copied': 'Copié : {label}',
  'demo.copyFailed': 'Copie impossible. Sélectionnez le texte et copiez-le à la main.',
  'demo.email': 'E-mail',
  'demo.password': 'Mot de passe',
  'demo.register.fill': 'Remplir avec un nouveau client démo',
  'demo.register.filled':
    'C’est rempli. Gardez le mot de passe si vous voulez vous reconnecter plus tard :',
  'demo.login.intro': 'Connectez-vous avec un client démo (commandes, points et animaux compris) :',
  'demo.login.use': 'Utiliser le compte de {name}',
  'demo.checkout.step': 'Étape {number} : {title}',
  'demo.checkout.contact': 'Remplir le contact',
  'demo.checkout.address': 'Remplir l’adresse',
  'demo.checkout.detailsHint':
    'Un nom, un e-mail et un téléphone fictifs, puis une adresse dans un pays livré par cette boutique.',
  'demo.checkout.delivery': 'Choisir l’option la moins chère',
  'demo.checkout.deliveryHint':
    'Toutes les options fonctionnent : rien n’est jamais expédié depuis cette démo.',
  'demo.checkout.paymentHint':
    'Les champs de carte sont dans le cadre sécurisé de Stripe : aucune page ne peut les remplir. Saisissez la carte de test Stripe :',
  'demo.checkout.cardNumber': 'Numéro de carte',
  'demo.checkout.expiry': 'Expiration',
  'demo.checkout.expiryHint': 'ou toute date future',
  'demo.checkout.cvc': 'Cryptogramme',
  'demo.checkout.cvcHint': 'ou trois chiffres au choix',
  'demo.checkout.why4242':
    'Pourquoi 4242 ? Les paiements passent par le mode test de Stripe, qui n’accepte que ses propres numéros de test : une carte d’apparence réelle comme 4111 1111 1111 1111 est refusée. Aucun argent ne circule.',
  'demo.checkout.otherMethods':
    'D’autres moyens de test (iDEAL, prélèvement SEPA, Klarna…) apparaissent dans le formulaire de paiement lorsqu’ils sont activés.',
};
