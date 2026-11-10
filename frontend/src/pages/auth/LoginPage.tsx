import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage, getApiFieldErrors } from '@/lib/api';
import { roleHome, safeRedirect } from '@/lib/auth';
import { DEMO_CREDENTIALS } from '@/lib/constants';
import { FloatingLabelInput } from '@/components/ui/Field';
import { PillButton } from '@/components/ui/PillButton';

const schema = z.object({
  email: z.string().min(1, 'Email is required.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      const user = await login(values);
      success(`Welcome back, ${user.name.split(' ')[0]}.`);
      navigate(safeRedirect(searchParams.get('redirect'), roleHome(user.role)), { replace: true });
    } catch (error) {
      const fieldErrors = getApiFieldErrors(error);
      let handledField = false;
      for (const [field, message] of Object.entries(fieldErrors)) {
        if (field === 'email' || field === 'password') {
          setError(field, { message });
          handledField = true;
        }
      }
      if (!handledField) setFormError(getApiErrorMessage(error, 'Unable to sign in. Please try again.'));
    }
  }

  function fillDemo(email: string, password: string) {
    setValue('email', email, { shouldValidate: true });
    setValue('password', password, { shouldValidate: true });
    setFormError(null);
  }

  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-label-md font-semibold uppercase tracking-[0.16em] text-brand">Welcome back</p>
        <h1 className="text-headline-lg font-bold tracking-[-0.015em] text-ink">Sign in to CrowdPredict</h1>
        <p className="mt-2 text-body-sm text-muted">
          Pick up your campaigns, pledges, and prediction history where you left off.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {formError ? (
          <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-error-container/50 px-4 py-3 text-body-sm text-danger" role="alert">
            <span className="material-symbols-outlined mt-0.5 text-[18px]" aria-hidden="true">
              error
            </span>
            {formError}
          </div>
        ) : null}

        <FloatingLabelInput
          label="Email address"
          type="email"
          leadingIcon="mail"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <FloatingLabelInput
          label="Password"
          type="password"
          leadingIcon="lock"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <PillButton type="submit" size="lg" fullWidth loading={isSubmitting}>
          Sign in
        </PillButton>
      </form>

      <p className="mt-5 text-center text-body-sm text-muted">
        New to CrowdPredict?{' '}
        <Link to="/register" className="font-semibold text-brand hover:underline">
          Create an account
        </Link>
      </p>

      <div className="mt-8 rounded-card border border-line/50 bg-surface-low/70 p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-brand" aria-hidden="true">
            key
          </span>
          <p className="text-label-lg font-semibold text-ink">Demo accounts</p>
        </div>
        <div className="grid gap-2">
          {DEMO_CREDENTIALS.map((credential) => (
            <button
              key={credential.role}
              type="button"
              onClick={() => fillDemo(credential.email, credential.password)}
              className="flex items-center justify-between gap-3 rounded-lg border border-line/40 bg-white px-3 py-2 text-left transition hover:border-brand/40 hover:bg-mint/20"
            >
              <span>
                <span className="block text-label-md font-semibold text-ink">{credential.role}</span>
                <span className="block text-label-md text-muted">{credential.email}</span>
              </span>
              <span className="rounded-pill bg-surface-container px-2 py-1 font-mono text-[11px] text-on-surface-variant">
                {credential.password}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-label-md text-muted">
          Mock mode is on by default, so these accounts work without a backend.
        </p>
      </div>
    </div>
  );
}
