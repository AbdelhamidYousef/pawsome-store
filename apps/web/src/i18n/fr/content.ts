import type { content as enNs } from '../en/content';
import type { Entry } from '../types';

export const content: Record<keyof typeof enNs, Entry> = {
  // Guides
  'content.guides.title': 'Guides de soins pour animaux',
  'content.guides.seoDescription':
    'Des guides courts et conviviaux pour les propriétaires de chiens, de chats, d’oiseaux, de poissons et de petits animaux.',
  'content.guides.intro':
    'De courtes lectures conviviales pour des animaux plus heureux. Rédigés pour une boutique de démonstration : prenez-les comme une source d’inspiration et demandez conseil à votre vétérinaire pour tout ce qui vous inquiète.',
  'content.guides.topics': 'Thèmes des guides',
  'content.guides.all': 'Tous les guides',
  'content.guides.list': 'Guides',
  'content.guides.listError': 'Nous n’avons pas pu charger les guides.',
  'content.guides.retry': 'Réessayer',
  'content.guides.noPage': 'La page {page} n’existe pas.',
  'content.guides.empty': 'Pas encore de guide ici. Revenez bientôt !',
  'content.guides.seeAll': 'Voir tous les guides',
  'content.guides.minRead': '{minutes} min de lecture',
  'content.guides.errorTitle': 'Une erreur s’est produite',
  'content.guides.loadError': 'Nous n’avons pas pu charger ce guide',
  'content.guides.home': 'Accueil',
  'content.guides.guides': 'Guides',
  'content.guides.products': 'Produits mentionnés dans ce guide',
  'content.guides.more': 'Autres guides',

  // Help centre
  'content.help.title': 'Centre d’aide',
  'content.help.seoDescription':
    'Des réponses sur la livraison, les retours, les paiements et votre compte.',
  'content.help.intro': 'Faites une recherche ou choisissez un thème.',
  'content.help.searchLabel': 'Rechercher dans l’aide',
  'content.help.searchInput': 'Rechercher dans le centre d’aide',
  'content.help.topics': 'Thèmes d’aide',
  'content.help.allTopics': 'Tous les thèmes',
  'content.help.topic.shipping': 'Livraison',
  'content.help.topic.returns': 'Retours',
  'content.help.topic.payments': 'Paiements',
  'content.help.topic.accounts': 'Comptes',
  'content.help.articles': 'Articles d’aide',
  'content.help.error': 'Nous n’avons pas pu charger les articles d’aide.',
  'content.help.retry': 'Réessayer',
  'content.help.nothingFound': 'Aucun résultat pour « {q} ».',
  'content.help.noArticles': 'Pas encore d’article dans ce thème.',
  'content.help.tryDifferent': 'Essayez d’autres mots, ou',
  'content.help.browseAll': 'parcourez tous les thèmes',
  'content.help.stuck': '. Toujours bloqué ?',
  'content.help.contact': 'Contactez-nous',
  'content.help.contactRest': 'et une vraie personne vous répondra.',
  'content.help.results': {
    one: '{count} réponse pour « {q} »',
    other: '{count} réponses pour « {q} »',
  },

  // Legal pages (the Markdown bodies stay English)
  'content.legal.notice':
    'Boutique de démonstration, société fictive. Ce texte est un exemple et ne constitue pas un conseil juridique.',
  'content.legal.about.title': 'À propos de Pawsome',
  'content.legal.about.description': 'Qui se cache derrière cette animalerie de démonstration.',
  'content.legal.shipping.title': 'Livraison',
  'content.legal.shipping.description': 'Options, tarifs et délais de livraison.',
  'content.legal.returns.title': 'Retours et rétractation',
  'content.legal.returns.description': 'Comment fonctionnent les retours et la rétractation.',
  'content.legal.privacy.title': 'Politique de confidentialité',
  'content.legal.privacy.description': 'Les données que nous collectons et pourquoi.',
  'content.legal.terms.title': 'Conditions générales de vente',
  'content.legal.terms.description': 'Exemple de conditions pour la boutique de démonstration.',
  'content.legal.cookies.title': 'Cookies',
  'content.legal.cookies.description':
    'Les cookies que nous déposons, et ceux que nous ne déposons pas.',
  'content.legal.accessibility.title': 'Déclaration d’accessibilité',
  'content.legal.accessibility.description':
    'Nos objectifs d’accessibilité et les lacunes connues.',

  // Contact
  'content.contact.title': 'Contactez-nous',
  'content.contact.seoDescription': 'Écrivez à l’équipe Pawsome.',
  'content.contact.intro':
    'Une question sur une commande, un produit ou vos données ? Écrivez-nous et une personne vous répondra. Vous trouverez peut-être une réponse rapide dans le',
  'content.contact.helpLink': 'centre d’aide',
  'content.contact.name': 'Votre nom',
  'content.contact.email': 'E-mail',
  'content.contact.emailHint': 'Nous répondons à cette adresse.',
  'content.contact.topic': 'De quoi s’agit-il ?',
  'content.contact.topicChoose': 'Choisir un sujet',
  'content.contact.topicRequired': 'Choisissez le sujet de votre message',
  'content.contact.topic.order': 'Ma commande',
  'content.contact.topic.shipping': 'Expédition et livraison',
  'content.contact.topic.returns': 'Retours et remboursements',
  'content.contact.topic.product': 'Un produit',
  'content.contact.topic.account': 'Mon compte',
  'content.contact.topic.privacy': 'Mes données et ma vie privée',
  'content.contact.topic.other': 'Autre chose',
  'content.contact.order': 'Numéro de commande (facultatif)',
  'content.contact.message': 'Votre message',
  'content.contact.honeypot': 'Laissez ce champ vide',
  'content.contact.send': 'Envoyer le message',
  'content.contact.tooMany':
    'Vous avez déjà envoyé plusieurs messages. Veuillez patienter un moment avant de réessayer.',
  'content.contact.failed':
    'Nous n’avons pas pu envoyer votre message pour le moment. Veuillez réessayer dans un instant.',
  'content.contact.sentTitle': 'Message envoyé',
  'content.contact.thanks': 'Merci, nous avons bien reçu votre message',
  'content.contact.referenceBefore': 'Votre référence est',
  'content.contact.referenceAfter':
    '. Nous vous avons envoyé une copie par e-mail et nous répondrons à cette adresse, en général sous deux jours ouvrés.',
  'content.contact.browseHelp': 'Parcourir le centre d’aide',

  // /developers
  'content.dev.seoTitle': 'Pour les développeurs : outils pour agents',
  'content.dev.seoDescription':
    'Pawsome propose des outils WebMCP structurés pour que les agents IA du navigateur puissent parcourir le catalogue de démonstration et remplir un panier. Expérimental, données de test uniquement.',
  'content.dev.title': 'Faire ses achats avec un agent IA',
  'content.dev.note':
    'Ceci est une boutique de démonstration avec des données de test, et WebMCP est une fonctionnalité expérimentale des navigateurs. Rien ici n’est une API publique stable.',
  'content.dev.whatTitle': 'Qu’est-ce que WebMCP ?',
  'content.dev.whatText':
    'WebMCP est un projet du W3C Web Machine Learning Community Group. Une page déclare des outils auprès du navigateur, et un agent IA intégré au navigateur les appelle avec des arguments JSON au lieu d’analyser l’écran. Les outils s’exécutent dans votre onglet, avec votre propre session et votre propre panier, via la même API que le site lui-même : un agent ne peut donc jamais faire plus que vous. Dans un navigateur sans WebMCP, cette page, comme toute la boutique, se comporte comme d’habitude.',
  'content.dev.tryTitle': 'Comment l’essayer',
  'content.dev.try1':
    'Utilisez Chrome 146 ou une version plus récente (Canary au moment de la rédaction).',
  'content.dev.try2Before': 'Ouvrez',
  'content.dev.try2After': ', réglez l’option sur Enabled et relancez le navigateur.',
  'content.dev.try3':
    'Ouvrez cette boutique et demandez à l’agent de votre navigateur de trouver un jouet et de l’ajouter au panier.',
  'content.dev.tryNote':
    'Le nom du réglage et l’API évoluent encore ; dernière vérification en novembre 2026. Les tests avec un agent de navigateur sont manuels : les tests automatisés utilisent un substitut de l’API du navigateur.',
  'content.dev.toolsTitle': 'Les {count} outils',
  'content.dev.readsOnly': '(lecture seule)',
  'content.dev.changesCart': '(modifie le panier)',
  'content.dev.schema': 'Schéma d’entrée',
  'content.dev.exampleCall': 'Exemple d’appel',
  'content.dev.exampleResult': 'Exemple de résultat',
  'content.dev.errorsLead': 'Les erreurs sont renvoyées sous la forme',
  'content.dev.errorsMid': 'avec les codes propres à la boutique, tels que',
  'content.dev.errorsAnd': 'et',
  'content.dev.errorsRest':
    '. Les appels sont limités à 30 par minute, et chaque modification du panier par un agent s’affiche à l’écran.',
  'content.dev.notExposedTitle': 'Ce qui n’est volontairement pas exposé',
  'content.dev.notExposed.checkout':
    'Le paiement : un agent remplit le panier, une personne vérifie et règle.',
  'content.dev.notExposed.orders':
    'Passer ou annuler des commandes, et consulter l’historique des commandes.',
  'content.dev.notExposed.account':
    'Les données de compte, d’adresse, de carte enregistrée, de fidélité et de liste de souhaits.',
  'content.dev.notExposed.clicking':
    'Tout ce que le client connecté ne pourrait pas déjà faire en cliquant.',

  // Messages from outside (shared Zod rules)
  'msg.content.required': 'Obligatoire',
  'msg.content.emailInvalid': 'Saisissez une adresse e-mail valide',
  'msg.content.messageShort': 'Dites-nous-en un peu plus (au moins 10 caractères)',
  'content.guides.read': 'Lire le guide',
  'content.contact.eyebrow': 'Nous sommes là pour vous',
  'content.contact.aboutTitle': 'Qui lit votre message',
  'content.contact.about':
    'Pawsome, c’est une petite équipe de passionnés d’animaux. Une vraie personne lit chaque message et y répond vraiment : pas de robot, pas de réponse toute faite.',
  'content.contact.replyLabel': 'Délai de réponse',
  'content.contact.replyValue': 'Sous un jour ouvré',
  'content.contact.hoursLabel': 'Horaires',
  'content.contact.hoursValue': 'Du lundi au vendredi, de 9 h à 17 h (heure d’Amsterdam)',
  'content.contact.emailLabel': 'Par e-mail',
  'content.contact.emailValue': 'Nous répondons à l’adresse indiquée dans le formulaire.',
  'content.contact.quickTitle': 'Réponses rapides',
  'content.contact.formTitle': 'Écrivez-nous',
};
