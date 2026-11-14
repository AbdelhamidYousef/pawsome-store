import type { Dictionary } from '../types';

export const content = {
  // Guides
  'content.guides.title': 'Pet-care guides',
  'content.guides.seoDescription':
    'Short, friendly guides for dog, cat, bird, fish and small pet owners.',
  'content.guides.intro':
    'Short, friendly reads for happier pets. Written for a demo store, so treat them as inspiration and ask your vet about anything that worries you.',
  'content.guides.topics': 'Guide topics',
  'content.guides.all': 'All guides',
  'content.guides.list': 'Guides',
  'content.guides.listError': 'We could not load the guides.',
  'content.guides.retry': 'Try again',
  'content.guides.noPage': 'There is no page {page}.',
  'content.guides.empty': 'No guides here yet. Check back soon!',
  'content.guides.seeAll': 'See all guides',
  'content.guides.minRead': '{minutes} min read',
  'content.guides.errorTitle': 'Something went wrong',
  'content.guides.loadError': 'We could not load this guide',
  'content.guides.home': 'Home',
  'content.guides.guides': 'Guides',
  'content.guides.products': 'Products mentioned in this guide',
  'content.guides.more': 'More guides',

  // Help centre
  'content.help.title': 'Help centre',
  'content.help.seoDescription': 'Answers about shipping, returns, payments and your account.',
  'content.help.intro': 'Search, or pick a topic.',
  'content.help.searchLabel': 'Search help',
  'content.help.searchInput': 'Search the help centre',
  'content.help.topics': 'Help topics',
  'content.help.allTopics': 'All topics',
  'content.help.topic.shipping': 'Shipping',
  'content.help.topic.returns': 'Returns',
  'content.help.topic.payments': 'Payments',
  'content.help.topic.accounts': 'Accounts',
  'content.help.articles': 'Help articles',
  'content.help.error': 'We could not load the help articles.',
  'content.help.retry': 'Try again',
  'content.help.nothingFound': 'Nothing found for "{q}".',
  'content.help.noArticles': 'No articles in this topic yet.',
  'content.help.tryDifferent': 'Try different words, or',
  'content.help.browseAll': 'browse every topic',
  'content.help.stuck': '. Still stuck?',
  'content.help.contact': 'Contact us',
  'content.help.contactRest': 'and a real person will answer.',
  'content.help.results': {
    one: '{count} answer for "{q}"',
    other: '{count} answers for "{q}"',
  },

  // Legal pages (the Markdown bodies stay English)
  'content.legal.notice':
    'Demo store, fictional company. This text is an example and is not legal advice.',
  'content.legal.about.title': 'About Pawsome',
  'content.legal.about.description': 'Who is behind this demo pet shop.',
  'content.legal.shipping.title': 'Shipping',
  'content.legal.shipping.description': 'Delivery options, prices and times.',
  'content.legal.returns.title': 'Returns and withdrawal',
  'content.legal.returns.description': 'How returns and withdrawal work.',
  'content.legal.privacy.title': 'Privacy notice',
  'content.legal.privacy.description': 'What data we collect and why.',
  'content.legal.terms.title': 'Terms and conditions',
  'content.legal.terms.description': 'Sample terms for the demo store.',
  'content.legal.cookies.title': 'Cookies',
  'content.legal.cookies.description': 'The cookies we set, and the ones we do not.',
  'content.legal.accessibility.title': 'Accessibility statement',
  'content.legal.accessibility.description': 'Our accessibility aims and known gaps.',

  // Contact
  'content.contact.title': 'Contact us',
  'content.contact.seoDescription': 'Write to the Pawsome team.',
  'content.contact.intro':
    'Questions about an order, a product or your data? Write to us and a person will answer. You may find a quick answer in the',
  'content.contact.helpLink': 'help centre',
  'content.contact.name': 'Your name',
  'content.contact.email': 'Email',
  'content.contact.emailHint': 'We reply to this address.',
  'content.contact.topic': 'What is it about?',
  'content.contact.topicChoose': 'Choose a topic',
  'content.contact.topicRequired': 'Choose what your message is about',
  'content.contact.topic.order': 'My order',
  'content.contact.topic.shipping': 'Shipping and delivery',
  'content.contact.topic.returns': 'Returns and refunds',
  'content.contact.topic.product': 'A product',
  'content.contact.topic.account': 'My account',
  'content.contact.topic.privacy': 'My data and privacy',
  'content.contact.topic.other': 'Something else',
  'content.contact.order': 'Order number (optional)',
  'content.contact.message': 'Your message',
  'content.contact.honeypot': 'Leave this empty',
  'content.contact.send': 'Send message',
  'content.contact.tooMany':
    'You have sent several messages already. Please wait a while and try again.',
  'content.contact.failed':
    'We could not send your message right now. Please try again in a moment.',
  'content.contact.sentTitle': 'Message sent',
  'content.contact.thanks': 'Thank you, we got your message',
  'content.contact.referenceBefore': 'Your reference is',
  'content.contact.referenceAfter':
    '. We have emailed you a copy and will reply to that address, usually within two working days.',
  'content.contact.browseHelp': 'Browse the help centre',

  // /developers
  'content.dev.seoTitle': 'For developers: agent tools',
  'content.dev.seoDescription':
    'Pawsome offers structured WebMCP tools so browser AI agents can search the demo catalogue and fill a cart. Experimental, test data only.',
  'content.dev.title': 'Shop with an AI agent',
  'content.dev.note':
    'This is a demo store on test data, and WebMCP is an experimental browser feature. Nothing here is a stable public API.',
  'content.dev.whatTitle': 'What is WebMCP?',
  'content.dev.whatText':
    'WebMCP is a draft from the W3C Web Machine Learning Community Group. A page registers tools with the browser, and an AI agent built into the browser calls them with JSON arguments instead of scraping the screen. The tools run in your tab, with your own session and cart, through the same API the site itself uses, so an agent can never do more than you can. In a browser without WebMCP this page, and the whole store, behave exactly as usual.',
  'content.dev.tryTitle': 'How to try it',
  'content.dev.try1': 'Use Chrome 146 or newer (Canary at the time of writing).',
  'content.dev.try2Before': 'Open',
  'content.dev.try2After': ', set it to Enabled and relaunch.',
  'content.dev.try3':
    "Open this store and ask the browser's agent to find a toy and add it to the cart.",
  'content.dev.tryNote':
    'The flag name and the API are still changing; this was last checked in November 2026. Browser-agent testing is manual: the automated tests use a stand-in for the browser API.',
  'content.dev.toolsTitle': 'The {count} tools',
  'content.dev.readsOnly': '(reads only)',
  'content.dev.changesCart': '(changes the cart)',
  'content.dev.schema': 'Input schema',
  'content.dev.exampleCall': 'Example call',
  'content.dev.exampleResult': 'Example result',
  'content.dev.errorsLead': 'Errors come back as',
  'content.dev.errorsMid': "using the store's own codes, such as",
  'content.dev.errorsAnd': 'and',
  'content.dev.errorsRest':
    '. Calls are limited to 30 a minute, and every cart change an agent makes shows a notice on screen.',
  'content.dev.notExposedTitle': 'What is deliberately not exposed',
  'content.dev.notExposed.checkout':
    'Checkout and payment: an agent fills the cart, a person reviews and pays.',
  'content.dev.notExposed.orders': 'Placing or cancelling orders, and reading order history.',
  'content.dev.notExposed.account': 'Account, address, saved card, loyalty and wishlist data.',
  'content.dev.notExposed.clicking':
    'Anything the signed-in shopper could not already do by clicking.',

  // Messages from outside (shared Zod rules)
  'msg.content.required': 'Required',
  'msg.content.emailInvalid': 'Enter a valid email address',
  'msg.content.messageShort': 'Tell us a little more (at least 10 characters)',
  'content.guides.read': 'Read the guide',
  'content.contact.eyebrow': 'We are here to help',
  'content.contact.aboutTitle': 'Who reads your message',
  'content.contact.about':
    'Pawsome is a small team of pet people. A person reads every message and answers it properly: no bots, no copy-and-paste replies.',
  'content.contact.replyLabel': 'Reply time',
  'content.contact.replyValue': 'Within one working day',
  'content.contact.hoursLabel': 'Opening hours',
  'content.contact.hoursValue': 'Monday to Friday, 9:00 to 17:00 (Amsterdam time)',
  'content.contact.emailLabel': 'By email',
  'content.contact.emailValue': 'We answer at the address you give us in the form.',
  'content.contact.quickTitle': 'Quick answers',
  'content.contact.formTitle': 'Send us a message',
  'content.help.moreTitle': 'Still need help?',
  'content.help.moreBody': 'Write to us and a person will answer within one working day.',
  'content.help.moreCta': 'Contact us',
} satisfies Dictionary;
