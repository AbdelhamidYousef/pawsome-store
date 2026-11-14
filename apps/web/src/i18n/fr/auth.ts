import type { auth as enNs } from '../en/auth';
import type { Entry } from '../types';

export const auth: Record<keyof typeof enNs, Entry> = {
  'auth.email': 'E-mail',
  'auth.password': 'Mot de passe',
  'auth.firstName': 'Prénom',
  'auth.lastName': 'Nom',
  'auth.signIn': 'Se connecter',
  'auth.createAccount': 'Créer un compte',
  'auth.login.newHere': 'Première visite ?',
  'auth.login.createLink': 'Créer un compte',
  'auth.register.passwordHint':
    'Au moins {min} caractères. Quelques mots au hasard font un mot de passe solide.',
  'auth.register.haveAccount': 'Vous avez déjà un compte ?',
  'auth.expired.message':
    'Votre session a expiré, vous avez donc été déconnecté. Votre panier est toujours là.',
  'auth.expired.signInLink': 'Reconnectez-vous',
  'auth.expired.rest':
    'pour utiliser vos informations enregistrées, ou continuez simplement en tant qu’invité.',
  'auth.forbidden.seoTitle': 'Accès refusé',
  'auth.forbidden.title': 'Vous n’avez pas accès à cette page',
  'auth.forbidden.body': 'Cet espace est réservé aux administrateurs de la boutique.',
  'auth.error.network': 'Impossible de joindre le serveur. Vérifiez votre connexion.',
  'auth.error.rateLimited': 'Trop de tentatives. Veuillez patienter quelques minutes.',
  'auth.error.generic': 'Une erreur s’est produite. Veuillez réessayer.',
  'msg.auth.emailInvalid': 'Saisissez une adresse e-mail valide',
  'msg.auth.required': 'Obligatoire',
  'msg.auth.passwordMin': 'Utilisez au moins 10 caractères',
  'msg.auth.passwordMax': 'Utilisez au plus 128 caractères',
  'msg.auth.passwordCommon': 'Ce mot de passe est trop courant',
  'msg.auth.emailTaken': 'Un compte existe déjà avec cette adresse e-mail',
  'msg.auth.invalidCredentials': 'Adresse e-mail ou mot de passe invalide',
};
