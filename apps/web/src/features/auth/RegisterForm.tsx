import { zodResolver } from '@hookform/resolvers/zod';
import { PASSWORD_MIN_LENGTH, RegisterSchema, type RegisterInput } from '@store/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { ApiError } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { useT } from '../../i18n';
import { safeNext } from '../../lib/safe-next';
import { clearReferral } from '../loyalty/referral-cookie';

import { FormAlert } from './AuthCard';
import { applyFieldErrors, formErrorMessage } from './form-errors';
import { useRegister } from './hooks';

export function RegisterForm({ next }: { next: string | null }) {
  const navigate = useNavigate();
  const { t, tm } = useT();
  const registerUser = useRegister();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
  });

  const target = safeNext(next, '/account');
  const submit = handleSubmit((values) => {
    setFormError(null);
    registerUser.mutate(values, {
      onSuccess: () => {
        // The server has read the cookie by now; it has done its job.
        clearReferral();
        void navigate(target, { replace: true });
      },
      onError: (error) => {
        if (error instanceof ApiError && error.code === 'CONFLICT') {
          // The API answers 409 for an email that exists; show it on the email field.
          setError(
            'email',
            { type: 'server', message: t('msg.auth.emailTaken') },
            { shouldFocus: true },
          );
        } else if (
          !applyFieldErrors(error, setError, ['firstName', 'lastName', 'email', 'password'])
        ) {
          setFormError(formErrorMessage(error, t, tm));
        }
      },
    });
  });

  return (
    <form
      onSubmit={(e) => void submit(e)}
      noValidate
      data-demo-form="register"
      className="mt-2 flex flex-col gap-4"
    >
      <FormAlert message={formError} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label={t('auth.firstName')}
          autoComplete="given-name"
          error={errors.firstName?.message}
          {...register('firstName')}
        />
        <Input
          label={t('auth.lastName')}
          autoComplete="family-name"
          error={errors.lastName?.message}
          {...register('lastName')}
        />
      </div>
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
        autoComplete="new-password"
        hint={t('auth.register.passwordHint', { min: PASSWORD_MIN_LENGTH })}
        error={errors.password?.message}
        {...register('password')}
      />
      <Button
        type="submit"
        size="lg"
        loading={registerUser.isPending}
        data-testid="register-submit"
      >
        {t('auth.createAccount')}
      </Button>
      <p className="text-center">
        {t('auth.register.haveAccount')}{' '}
        <Link
          to={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
          className="font-semibold text-primary-strong underline"
        >
          {t('auth.signIn')}
        </Link>
      </p>
    </form>
  );
}
