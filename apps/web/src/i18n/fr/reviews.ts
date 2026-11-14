import type { reviews as enNs } from '../en/reviews';
import type { Entry } from '../types';

export const reviews: Record<keyof typeof enNs, Entry> = {
  'reviews.heading': 'Avis des clients',
  'reviews.loadError': 'Nous n’avons pas pu charger les avis.',
  'reviews.retry': 'Réessayer',
  'reviews.none': 'Aucun avis pour l’instant. Soyez le premier à partager votre expérience.',
  'reviews.outOf5': 'sur 5',
  'reviews.ratingLabel': '{rating} sur 5',
  'reviews.count': { one: '{count} avis', other: '{count} avis' },
  'reviews.stars': { one: '{count} étoile', other: '{count} étoiles' },
  'reviews.recommend': '{percent} % le recommandent',
  'reviews.sort.label': 'Trier les avis',
  'reviews.sort.helpful': 'Les plus utiles',
  'reviews.sort.newest': 'Les plus récents',
  'reviews.sort.photos': 'Avec photos d’abord',
  'reviews.clearFilters': 'Effacer les filtres',
  'reviews.noMatch': 'Aucun avis ne correspond à ces filtres.',
  'reviews.write': 'Écrire un avis',
  'reviews.signIn': 'Connectez-vous',
  'reviews.signInToWrite': 'pour écrire un avis.',

  'reviews.breakdown.label': 'Avis par note en étoiles',
  'reviews.breakdown.row': {
    one: 'Avis {count} étoile : {n}',
    other: 'Avis {count} étoiles : {n}',
  },
  'reviews.breakdown.rowOn': {
    one: 'Avis {count} étoile : {n}, filtre activé',
    other: 'Avis {count} étoiles : {n}, filtre activé',
  },
  'reviews.topics.heading': 'Points souvent cités',

  'reviews.card.verified': 'Achat vérifié',
  'reviews.card.recommend': 'Recommande',
  'reviews.card.notRecommend': 'Ne recommande pas',
  'reviews.card.photos': 'Photos de clients',
  'reviews.card.openPhoto': 'Ouvrir la photo {n} sur {total}',
  'reviews.card.photoTitle': 'Photo de client',
  'reviews.card.photoAlt': 'Photo de l’avis de {author} : {title}',
  'reviews.card.helpful': 'Utile ({count})',
  'reviews.card.markedHelpful': 'Marqué comme utile ({count})',
  'reviews.card.signInHelpful': 'Connectez-vous pour marquer comme utile ({count})',

  'reviews.age.months': { one: '{count} mois', other: '{count} mois' },
  'reviews.age.years': { one: '{count} an', other: '{count} ans' },
  'reviews.age.yearsMonths': '{years} et {months}',
  'reviews.pet.age': 'Âge de l’animal : {age}',
  'reviews.pet.weight': 'pèse {weight}',
  'reviews.pet.size': 'a acheté la taille {size}',

  'reviews.form.title': 'Donner un avis sur {name}',
  'reviews.form.rating': 'Votre note',
  'reviews.form.titleLabel': 'Titre',
  'reviews.form.bodyLabel': 'Votre avis',
  'reviews.form.bodyHint':
    'Qu’en avez-vous pensé, vous et votre animal ? De 20 à 2 000 caractères.',
  'reviews.form.recommend': 'Je recommande ce produit',
  'reviews.form.aboutPet': 'À propos de votre animal (facultatif)',
  'reviews.form.petAge': 'Âge de l’animal (mois)',
  'reviews.form.petWeight': 'Poids de l’animal (kg)',
  'reviews.form.size': 'Taille achetée',
  'reviews.form.photosLabel': 'Photos (facultatif, jusqu’à {max}, 3 Mo chacune)',
  'reviews.form.photosToUpload': 'Photos à ajouter',
  'reviews.form.photoPreview': 'Aperçu de {name}',
  'reviews.form.remove': 'Retirer',
  'reviews.form.uploadsOff':
    'L’ajout de photos arrive bientôt. En attendant, racontez-nous tout avec des mots.',
  'reviews.form.note':
    'Les avis sont vérifiés avant d’apparaître. Merci de n’y inclure aucune donnée personnelle.',
  'reviews.form.submit': 'Envoyer l’avis',
  'reviews.form.photoType': '{name} : utilisez une image JPEG, PNG ou WebP',
  'reviews.form.photoSize': '{name} : chaque photo ne peut pas dépasser 3 Mo',
  'reviews.form.photoMax': 'Vous pouvez joindre jusqu’à {max} photos',
  'reviews.form.thanks': 'Merci ! Votre avis est en attente de validation.',
  'reviews.form.thanksNote':
    'Nous vérifions chaque avis avant qu’il apparaisse sur la page, généralement sous quelques jours.',
  'reviews.form.thanksVerified':
    'Il portera la mention « Achat vérifié » car vous avez acheté ce produit chez nous.',

  'msg.reviews.rating': 'Choisissez une note en étoiles',
  'msg.reviews.titleShort': 'Donnez un court titre à votre avis',
  'msg.reviews.titleLong': '80 caractères au maximum',
  'msg.reviews.bodyShort': 'Veuillez écrire au moins 20 caractères',
  'msg.reviews.bodyLong': '2 000 caractères au maximum',
  'msg.reviews.petAge': 'Saisissez un âge compris entre 0 et 600 mois',
  'msg.reviews.petWeight': 'Saisissez un poids compris entre 0,05 et 120 kg',
};
