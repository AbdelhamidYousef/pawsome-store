import type { ReactNode } from 'react';

import { Container } from '../../components/layout/Container';

// The centred card shared by sign-in and registration. `helper` (the demo helper panel) sits above
// the card on a phone and beside it on a wide screen, so both stay in view while filling the form.
export function AuthCard({
  title,
  testId,
  helper,
  children,
}: {
  title: string;
  testId: string;
  helper?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Container
      className="flex flex-col items-center gap-6 py-8 sm:py-12 lg:flex-row lg:items-start lg:justify-center lg:gap-8"
      data-testid={testId}
    >
      {helper && (
        <div className="w-full max-w-md empty:hidden lg:order-last lg:max-w-sm">{helper}</div>
      )}
      <div className="w-full max-w-md rounded-card border-2 border-line bg-surface p-6 shadow-card sm:p-8">
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        {children}
      </div>
    </Container>
  );
}

// A form-level error. role=alert makes a screen reader announce it as soon as it appears.
export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      data-testid="form-error"
      className="mt-4 rounded-control border-2 border-danger bg-danger-soft p-3 font-semibold text-danger"
    >
      {message}
    </p>
  );
}
