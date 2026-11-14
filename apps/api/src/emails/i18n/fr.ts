import type { TextEntry } from '@store/shared';

import type { EmailKey } from './en.ts';

// Textes des e-mails en français (vouvoiement). Mêmes clés et mêmes marqueurs que en.ts. Une espace
// insécable précède ? ! : ; comme le veut la typographie française.
export const fr: Record<EmailKey, TextEntry> = {
  'mail.footer':
    'Merci d’avoir choisi Pawsome. Les paiements fonctionnent en mode test Stripe : aucune carte n’a été débitée.',
  'mail.signoff': '- L’équipe Pawsome',
  'mail.hello': 'Bonjour {name},',
  'mail.seeOrder': 'Voir votre commande',
  'mail.orderLine': 'Commande : {url}',

  'order.qty': 'qté {quantity}',
  'order.subtotal': 'Sous-total',
  'order.shipping': 'Livraison ({method})',
  'order.discount': 'Remise',
  'order.donation': 'Don à Whisker Hollow Rescue',
  'order.total': 'Total',
  'order.shippingTo': 'Adresse de livraison :',
  'order.deliveringTo': 'Livraison à :',

  'confirm.subject': 'Votre commande Pawsome {number} est confirmée',
  'confirm.thanks': 'Merci pour votre commande, {name} !',
  'confirm.paid': 'La commande {number} est payée et nous la préparons.',
  'confirm.willEmail': 'Nous vous écrirons de nouveau dès son expédition.',
  'confirm.follow': 'Suivez votre commande à tout moment : {url}',
  'confirm.preheader': 'La commande {number} est confirmée.',
  'confirm.heading': 'Merci pour votre commande !',
  'confirm.intro': 'Bonjour {name}, la commande {number} est payée et nous la préparons.',
  'confirm.track': 'Suivre votre commande',
  'confirm.trackNote': '(vous aurez besoin de l’adresse e-mail utilisée pour commander).',

  'shipped.subject': 'Votre commande Pawsome {number} est en route',
  'shipped.good': 'Bonne nouvelle, {name} : la commande {number} a été expédiée !',
  'shipped.method': 'Mode de livraison : {method}',
  'shipped.preheader': 'La commande {number} a été expédiée.',
  'shipped.heading': 'Votre commande est en route !',
  'shipped.intro': 'Bonjour {name}, la commande {number} a été expédiée avec {method}.',

  'withdrawal.subject': 'Nous avons reçu votre rétractation pour la commande {number}',
  'withdrawal.body':
    'Cet e-mail confirme que le {when}, nous avons reçu votre déclaration de rétractation du contrat de la commande {number}.',
  'withdrawal.reference': 'Référence : {reference}',
  'withdrawal.covers': 'Concerne : {scope}',
  'withdrawal.wholeOrder': 'toute la commande',
  'withdrawal.reason': 'Motif indiqué : {reason}',
  'withdrawal.next':
    'Nous vous écrirons de nouveau avec les prochaines étapes. Conservez cet e-mail comme preuve.',
  'withdrawal.preheader': 'Rétractation pour la commande {number} reçue.',
  'withdrawal.heading': 'Nous avons reçu votre rétractation',

  'return.requested.subject': 'Nous avons reçu votre demande de retour pour la commande {order}',
  'return.requested.heading': 'Nous avons reçu votre demande de retour',
  'return.requested.l1':
    'Merci, nous avons votre demande ({ref}) pour la commande {order}. Quelqu’un va l’examiner bientôt et vous indiquera la suite par e-mail.',
  'return.requested.l2': 'Vous souhaitez retourner : {list}.',
  'return.approved.subject': 'Votre retour {ref} est approuvé',
  'return.approved.heading': 'Votre retour est approuvé',
  'return.approved.l1':
    'Bonne nouvelle : votre retour {ref} pour la commande {order} est approuvé.',
  'return.approved.l2':
    'Comment nous le renvoyer : emballez {list} dans l’emballage d’origine si possible, écrivez {ref} sur le colis et envoyez-le à Pawsome Returns, 1 Bone Street, Riga LV-1010.',
  'return.approved.l3':
    'Dès que le colis sera arrivé et vérifié, nous vous rembourserons et vous écrirons de nouveau.',
  'return.rejected.subject': 'À propos de votre retour {ref}',
  'return.rejected.heading': 'Nous n’avons pas pu accepter ce retour',
  'return.rejected.l1':
    'Nous sommes désolés : nous n’avons pas pu accepter le retour {ref} pour la commande {order}.',
  'return.rejected.reason': 'Motif : {reason}',
  'return.rejected.noReason': 'Écrivez-nous si vous souhaitez en savoir plus.',
  'return.received.subject': 'Nous avons reçu votre retour {ref}',
  'return.received.heading': 'Votre colis est arrivé',
  'return.received.l1': 'Votre retour {ref} pour la commande {order} est arrivé : {list}.',
  'return.received.l2':
    'Nous préparons votre remboursement de {money}. Vous recevrez encore un e-mail lorsqu’il sera effectué.',
  'return.refunded.subject': 'Votre remboursement de {money} est en route',
  'return.refunded.heading': 'Votre remboursement est en route',
  'return.refunded.l1': 'Nous avons remboursé {money} pour le retour {ref} (commande {order}).',
  'return.refunded.simulated':
    'Le remboursement sera versé sur la carte utilisée pour le paiement.',
  'return.refunded.real':
    'Il apparaît généralement sur votre carte sous quelques jours, selon votre banque.',

  'vet.held.subject': 'La commande {number} attend l’accord d’un vétérinaire',
  'vet.held.heading': 'Votre commande attend l’accord d’un vétérinaire',
  'vet.held.l1':
    'Merci ! La commande {number} contient un article qui nécessite l’accord d’un vétérinaire ; nous la retenons jusqu’à la décision. Votre paiement est en sécurité et les articles sont mis de côté pour vous.',
  'vet.held.l2':
    'Nous vous écrirons dès qu’il y aura une réponse. La plupart des demandes sont traitées sous un jour ouvré.',
  'vet.approved.subject': 'La commande {number} est approuvée et en préparation',
  'vet.approved.heading': 'Approuvée, nous la préparons',
  'vet.approved.l1':
    'Bonne nouvelle : le contrôle vétérinaire de la commande {number} est terminé et votre commande est en cours de préparation.',
  'vet.rejected.subject': 'La commande {number} n’a pas été approuvée',
  'vet.rejected.heading': 'Nous n’avons pas pu approuver cette commande',
  'vet.rejected.l1':
    'Nous sommes désolés : le contrôle vétérinaire de la commande {number} n’a pas été approuvé ; la commande est annulée et votre paiement est intégralement remboursé.',
  'vet.rejected.reason': 'Motif : {reason}',
  'vet.rejected.simulated': 'Le remboursement sera versé sur la carte utilisée pour le paiement.',
  'vet.rejected.real':
    'Le remboursement apparaît généralement sur votre carte sous quelques jours.',

  'news.unsub.text':
    'Vous recevez ce message parce que vous êtes abonné aux actualités Pawsome. Se désabonner en un clic : {url}',
  'news.unsub.lead': 'Vous recevez ce message parce que vous êtes abonné aux actualités Pawsome.',
  'news.unsub.link': 'Se désabonner en un clic',
  'news.confirm.subject': 'Confirmez votre abonnement Pawsome',
  'news.confirm.l1':
    'Encore une étape : veuillez confirmer que vous souhaitez recevoir les actualités, offres et conseils pour animaux de Pawsome.',
  'news.confirm.link': 'Confirmer : {url}',
  'news.confirm.button': 'Oui, je m’abonne',
  'news.confirm.hours': {
    one: 'Le lien est valable {count} heure. Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail : rien ne vous sera envoyé.',
    other:
      'Le lien est valable {count} heures. Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail : rien ne vous sera envoyé.',
  },
  'news.confirm.preheader': 'Confirmez votre adresse pour recevoir votre code de bienvenue',
  'news.confirm.heading': 'Confirmez votre abonnement',
  'news.welcome.subject':
    'Bienvenue chez Pawsome : {percent} % de remise sur votre première commande',
  'news.welcome.l1': 'C’est fait. Merci pour votre abonnement !',
  'news.welcome.code': 'Votre code de bienvenue : {code}',
  'news.welcome.terms': {
    one: '{percent} % de remise sur votre première commande, un seul usage, valable {count} jour.',
    other:
      '{percent} % de remise sur votre première commande, un seul usage, valable {count} jours.',
  },
  'news.welcome.enter': 'Saisissez-le dans le panier.',
  'news.welcome.preheader': 'Votre code de bienvenue de {percent} % est à l’intérieur',
  'news.welcome.heading': 'Bienvenue dans la meute',

  'stock.subject': 'De nouveau en stock : {product}',
  'stock.l1': 'Bonne nouvelle : {product} ({variant}) est de nouveau en stock.',
  'stock.look': 'Voir l’article : {url}',
  'stock.button': 'Voir dans la boutique',
  'stock.hurry': 'Le stock peut partir vite, nous ne pouvons donc pas en garder un pour vous.',
  'stock.once': 'Vous nous avez demandé cet unique e-mail.',
  'stock.cancel': 'Plus intéressé ?',
  'stock.preheader': '{product} est de retour',
  'stock.heading': 'De nouveau en stock',

  'pet.birthday.subject': 'Joyeux anniversaire, {pet} !',
  'pet.birthday.heading': 'Joyeux anniversaire, {pet} !',
  'pet.birthday.treat': 'Un cadeau de notre part : {percent} % de remise, rien que pour vous.',
  'pet.birthday.code': 'Code : {code}',
  'pet.birthday.terms': {
    one: 'Un seul usage, valable {count} jour, et uniquement sur votre compte.',
    other: 'Un seul usage, valable {count} jours, et uniquement sur votre compte.',
  },
  'pet.birthday.shop': 'Boutique : {url}',
  'pet.birthday.button': 'Choisir un cadeau d’anniversaire',
  'pet.birthday.preheader': '{percent} % de remise pour l’anniversaire de {pet}',
  'pet.stage.subject': '{pet} a {age} : le moment de regarder l’alimentation ?',
  'pet.stage.today': '{pet} a {age} aujourd’hui.',
  'pet.stage.heading': '{pet} a {age}',
  'pet.stage.dog':
    'Un chiot en croissance a besoin d’une alimentation différente en grandissant. Il est peut-être temps de changer ; votre vétérinaire pourra vous dire quand.',
  'pet.stage.cat':
    'Un chaton en croissance a besoin d’une alimentation différente en grandissant. Il est peut-être temps de changer ; votre vétérinaire pourra vous dire quand.',
  'pet.stage.see': 'Découvrez notre sélection : {url}',
  'pet.stage.button': 'Voir l’alimentation',
  'pet.stage.preheader.dog': 'L’alimentation des chiots change en grandissant',
  'pet.stage.preheader.cat': 'L’alimentation des chatons change en grandissant',
  'pet.age.life_stage_8w': '8 semaines',
  'pet.age.life_stage_6m': '6 mois',
  'pet.age.life_stage_12m': '12 mois',

  'contact.topic.order': 'Ma commande',
  'contact.topic.shipping': 'Livraison',
  'contact.topic.returns': 'Retours et remboursements',
  'contact.topic.product': 'Un produit',
  'contact.topic.account': 'Mon compte',
  'contact.topic.privacy': 'Mes données et ma vie privée',
  'contact.topic.other': 'Autre chose',
  'contact.ack.subject': 'Nous avons reçu votre message ({reference})',
  'contact.ack.l1':
    'Merci d’avoir écrit à Pawsome. Une personne vous répondra à cette adresse, généralement sous deux jours ouvrés.',
  'contact.ack.reference': 'Référence : {reference}',
  'contact.ack.topic': 'Sujet : {topic}',
  'contact.ack.order': 'Commande : {order}',
  'contact.ack.yourMessage': 'Votre message :',
  'contact.ack.preheader': 'Nous avons bien reçu votre message.',
  'contact.ack.heading': 'Nous avons reçu votre message',

  'safety.recall': 'Rappel de produit : {title}',
  'safety.notice': 'Avis de sécurité produit : {title}',
  'safety.reason':
    'Vous recevez ce message parce que vous avez acheté un produit concerné chez Pawsome.',
  'review.subject': 'Votre avis sur {product} est en ligne',
  'review.l1':
    'Merci d’avoir donné votre avis sur {product} ! Il a passé notre contrôle et figure maintenant sur la page du produit, où il aide les autres propriétaires d’animaux à choisir.',
  'review.see': 'Le voir ici : {url}',
  'review.link': 'Voir votre avis',
  'review.preheader': 'Votre avis sur {product} est en ligne.',
  'review.heading': 'Merci pour votre avis !',
};
