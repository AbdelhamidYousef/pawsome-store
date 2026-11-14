import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, type LoginInput } from '@store/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { useT } from '../../i18n';
import { safeNext } from '../../lib/safe-next';

import { FormAlert } from './AuthCard';
import { applyFieldErrors, formErrorMessage } from './form-errors';
import { useLogin } from './hooks';

export function LoginForm({ next }: { next: string | null }) {
  const navigate = useNavigate();
  const { t, tm } = useT();
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const target = safeNext(next);
  const submit = handleSubmit((values) => {
    setFormError(null);
    login.mutate(values, {
      onSuccess: () => void navigate(target, { replace: true }),
      onError: (error) => {
        // "Invalid email or password" is a 401 on purpose vague (no hint which half was wrong), so
        // it is a form-level message, not a field error.
        if (!applyFieldErrors(error, setError, ['email', 'password'])) {
          setFormError(formErrorMessage(error, t, tm));
        }
      },
    });
  });

  return (
    <form
      onSubmit={(e) => void submit(e)}
      noValidate
      data-demo-form="login"
      className="mt-2 flex flex-col gap-4"
    >
      <FormAlert message={formError} />
      <Input
        label={t('auth.email')}
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <PasswordInput
        label={t('auth.password')}
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <Button type="submit" size="lg" loading={login.isPending} data-testid="login-submit">
        {t('auth.signIn')}
      </Button>
      <p className="text-center">
        {t('auth.login.newHere')}{' '}
        <Link
          to={next ? `/register?next=${encodeURIComponent(next)}` : '/register'}
          className="font-semibold text-primary-strong underline"
        >
          {t('auth.login.createLink')}
        </Link>
      </p>
    </form>
  );
}
