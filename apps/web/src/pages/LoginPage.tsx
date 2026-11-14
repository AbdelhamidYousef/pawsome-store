import { Navigate, useSearchParams } from 'react-router-dom';

import { Seo } from '../components/Seo';
import { AuthCard } from '../features/auth/AuthCard';
import { useAuth } from '../features/auth/AuthProvider';
import { LoginForm } from '../features/auth/LoginForm';
import { SessionExpiredNotice } from '../features/auth/SessionExpiredNotice';
import { LoginDemoHelper } from '../features/demo-helper/helpers';
import { useT } from '../i18n';
import { safeNext } from '../lib/safe-next';

export default function LoginPage() {
  const [params] = useSearchParams();
  const next = params.get('next');
  const { status } = useAuth();
  const { t } = useT();
  // Someone who is already signed in has no use for the form.
  if (status === 'authenticated') return <Navigate to={safeNext(next)} replace />;
  return (
    <AuthCard title={t('auth.signIn')} testId="page-login" helper={<LoginDemoHelper />}>
      <Seo title={t('auth.signIn')} noindex />
      <SessionExpiredNotice />
      <LoginForm next={next} />
    </AuthCard>
  );
}
