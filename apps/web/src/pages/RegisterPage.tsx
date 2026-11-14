import { Navigate, useSearchParams } from 'react-router-dom';

import { Seo } from '../components/Seo';
import { AuthCard } from '../features/auth/AuthCard';
import { useAuth } from '../features/auth/AuthProvider';
import { RegisterForm } from '../features/auth/RegisterForm';
import { RegisterDemoHelper } from '../features/demo-helper/helpers';
import { useT } from '../i18n';
import { safeNext } from '../lib/safe-next';

export default function RegisterPage() {
  const [params] = useSearchParams();
  const next = params.get('next');
  const { status } = useAuth();
  const { t } = useT();
  if (status === 'authenticated') return <Navigate to={safeNext(next, '/account')} replace />;
  return (
    <AuthCard
      title={t('auth.createAccount')}
      testId="page-register"
      helper={<RegisterDemoHelper />}
    >
      <Seo title={t('auth.createAccount')} noindex />
      <RegisterForm next={next} />
    </AuthCard>
  );
}
