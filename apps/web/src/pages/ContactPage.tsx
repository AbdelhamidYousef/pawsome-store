import {
  CONTACT_TOPICS,
  ContactBodySchema,
  type ContactReceipt,
  type ContactTopic,
} from '@store/shared';
import { useMutation } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { ApiError } from '../api/client';
import { sendContactMessage } from '../api/contact';
import { ChevronRightIcon } from '../components/icons';
import { Container } from '../components/layout/Container';
import { Seo } from '../components/Seo';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { FormAlert } from '../features/auth/AuthCard';
import { useT, type StringKey, type TFunction } from '../i18n';
import { TEST_IDS } from '../lib/test-ids';
import { track } from '../lib/track';

type Field = 'name' | 'email' | 'topic' | 'message';

const TOPIC_KEYS: Record<ContactTopic, StringKey> = {
  order: 'content.contact.topic.order',
  shipping: 'content.contact.topic.shipping',
  returns: 'content.contact.topic.returns',
  product: 'content.contact.topic.product',
  account: 'content.contact.topic.account',
  privacy: 'content.contact.topic.privacy',
  other: 'content.contact.topic.other',
};

const INFO: readonly (readonly [StringKey, StringKey])[] = [
  ['content.contact.replyLabel', 'content.contact.replyValue'],
  ['content.contact.hoursLabel', 'content.contact.hoursValue'],
  ['content.contact.emailLabel', 'content.contact.emailValue'],
];

const QUICK_LINKS: readonly (readonly [string, StringKey])[] = [
  ['/help', 'shell.footer.helpCentre'],
  ['/track-order', 'shell.footer.trackOrder'],
  ['/returns', 'shell.footer.legalReturns'],
  ['/shipping', 'shell.footer.legalShipping'],
];

function messageFor(error: unknown, t: TFunction): string {
  if (error instanceof ApiError && error.status === 429) {
    return t('content.contact.tooMany');
  }
  return t('content.contact.failed');
}

export default function ContactPage() {
  const { t, tm } = useT();
  const [values, setValues] = useState({
    name: '',
    email: '',
    topic: '' as ContactTopic | '',
    orderNumber: '',
    message: '',
    website: '',
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [receipt, setReceipt] = useState<ContactReceipt | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const topicRef = useRef<HTMLSelectElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const send = useMutation({
    mutationFn: sendContactMessage,
    onSuccess: (r, sent) => {
      setReceipt(r);
      track({ name: 'contact_sent', topic: sent.topic });
    },
  });

  const set = (key: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = ContactBodySchema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === 'name' || key === 'email' || key === 'topic' || key === 'message') {
          next[key] ??= key === 'topic' ? t('content.contact.topicRequired') : tm(issue.message);
        }
      }
      setErrors(next);
      // Move focus to the first field with a problem, so a keyboard or screen-reader user lands on it.
      const first = (['name', 'email', 'topic', 'message'] as const).find((k) => next[k]);
      const target = { name: nameRef, email: emailRef, topic: topicRef, message: messageRef }[
        first ?? 'name'
      ];
      if (first) target.current?.focus();
      return;
    }
    setErrors({});
    send.mutate(parsed.data);
  };

  if (receipt) {
    return (
      <Container className="py-16 sm:py-24" data-testid={TEST_IDS.pageContact}>
        <Seo title={t('content.contact.sentTitle')} noindex />
        <section
          aria-labelledby="contact-done"
          className="mx-auto max-w-xl rounded-card border-2 border-success bg-success-soft p-6 text-center sm:p-10"
          data-testid={TEST_IDS.contactSuccess}
        >
          <h1 id="contact-done" className="font-display text-3xl font-semibold">
            {t('content.contact.thanks')}
          </h1>
          <p className="mt-2">
            {t('content.contact.referenceBefore')} <strong>{receipt.reference}</strong>
            {t('content.contact.referenceAfter')}
          </p>
          <p className="mt-4">
            <Link to="/help" className="font-semibold text-primary-strong underline">
              {t('content.contact.browseHelp')}
            </Link>
          </p>
        </section>
      </Container>
    );
  }

  return (
    <Container className="pb-16 pt-10 sm:pb-24 sm:pt-14" data-testid={TEST_IDS.pageContact}>
      <Seo title={t('content.contact.title')} description={t('content.contact.seoDescription')} />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-strong">
            {t('content.contact.eyebrow')}
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">
            {t('content.contact.title')}
          </h1>
          <p className="mt-4 text-lg text-muted">
            {t('content.contact.intro')}{' '}
            <Link to="/help" className="font-semibold text-primary-strong underline">
              {t('content.contact.helpLink')}
            </Link>
            .
          </p>

          <section aria-labelledby="contact-about" className="mt-10">
            <h2 id="contact-about" className="font-display text-xl font-semibold">
              {t('content.contact.aboutTitle')}
            </h2>
            <p className="mt-2 leading-relaxed">{t('content.contact.about')}</p>
          </section>

          <dl className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {INFO.map(([label, value]) => (
              <div key={label} className="rounded-card bg-primary-soft p-4">
                <dt className="text-sm font-semibold text-primary-strong">{t(label)}</dt>
                <dd className="mt-1 text-sm leading-snug">{t(value)}</dd>
              </div>
            ))}
          </dl>

          <nav aria-labelledby="contact-quick" className="mt-10">
            <h2 id="contact-quick" className="font-display text-xl font-semibold">
              {t('content.contact.quickTitle')}
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {QUICK_LINKS.map(([to, label]) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="group flex min-h-12 items-center justify-between gap-2 rounded-control border border-line bg-surface px-4 font-semibold transition-colors hover:border-primary-strong hover:text-primary-strong"
                  >
                    {t(label)}
                    <ChevronRightIcon className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <section
          aria-labelledby="contact-form-title"
          className="min-w-0 self-start rounded-card bg-surface p-6 shadow-card sm:p-8 lg:sticky lg:top-24"
        >
          <h2 id="contact-form-title" className="font-display text-2xl font-semibold">
            {t('content.contact.formTitle')}
          </h2>
          <form
            onSubmit={submit}
            noValidate
            data-testid={TEST_IDS.contactForm}
            className="relative mt-6 flex flex-col gap-4"
          >
            <FormAlert message={send.error ? messageFor(send.error, t) : null} />
            <Input
              ref={nameRef}
              label={t('content.contact.name')}
              autoComplete="name"
              value={values.name}
              onChange={set('name')}
              error={errors.name}
            />
            <Input
              ref={emailRef}
              label={t('content.contact.email')}
              type="email"
              autoComplete="email"
              inputMode="email"
              hint={t('content.contact.emailHint')}
              value={values.email}
              onChange={set('email')}
              error={errors.email}
            />
            <Select
              ref={topicRef}
              label={t('content.contact.topic')}
              value={values.topic}
              onChange={set('topic')}
              error={errors.topic}
            >
              <option value="">{t('content.contact.topicChoose')}</option>
              {CONTACT_TOPICS.map((topic) => (
                <option key={topic} value={topic}>
                  {t(TOPIC_KEYS[topic])}
                </option>
              ))}
            </Select>
            <Input
              label={t('content.contact.order')}
              placeholder="PW-2026-000123"
              autoComplete="off"
              value={values.orderNumber}
              onChange={set('orderNumber')}
            />
            <Textarea
              ref={messageRef}
              label={t('content.contact.message')}
              rows={6}
              maxLength={2000}
              value={values.message}
              onChange={set('message')}
              error={errors.message}
            />
            {/* Honeypot: out of sight and out of the tab order for people; a script that fills every
            input fills this one too, and the API then drops the message silently. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                {t('content.contact.honeypot')}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={values.website}
                  onChange={set('website')}
                  data-testid={TEST_IDS.contactHoneypot}
                />
              </label>
            </div>
            <Button type="submit" loading={send.isPending}>
              {t('content.contact.send')}
            </Button>
          </form>
        </section>
      </div>
    </Container>
  );
}
