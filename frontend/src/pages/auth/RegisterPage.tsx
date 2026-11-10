import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage, getApiFieldErrors } from '@/lib/api';
import { roleHome } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { FloatingLabelInput } from '@/components/ui/Field';
import { PillButton } from '@/components/ui/PillButton';

const schema = z
  .object({
    name: z.string().min(2, 'Enter your full name.'),
    email: z.string().min(1, 'Email is required.').email('Enter a valid email address.'),
    password: z.string().min(6, 'Use at least 6 characters.'),
    confirmPassword: z.string().min(1, 'Confirm your password.'),
    role: z.enum(['backer', 'creator']),
    organization: z.string().optional(),
  })
  .superRefine((values, context) => {
    if (values.password !== values.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords do not match.',
      });
    }
    if (values.role === 'creator' && !values.organization?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['organization'],
        message: 'Organization is required for creator accounts.',
      });
    }
  });

type FormValues = z.infer<typeof schema>;

const ROLES = [
  {
    value: 'backer' as const,
    icon: 'favorite',
    title: 'Backer',
    description: 'Discover campaigns and fund the ideas you believe in.',
  },
  {
    value: 'creator' as const,
    icon: 'rocket_launch',
    title: 'Creator',
    description: 'Launch campaigns and test them with the prediction engine.',
  },
];

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'backer',
      organization: '',
    },
  });

  const selectedRole = watch('role');

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      const user = await registerUser({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        role: values.role,
        organization: values.role === 'creator' ? values.organization?.trim() : undefined,
      });
      success('Your CrowdPredict account is ready.');
      navigate(roleHome(user.role), { replace: true });
    } catch (error) {
      const fieldErrors = getApiFieldErrors(error);
      let handledField = false;
      for (const [field, message] of Object.entries(fieldErrors)) {
        if (field === 'name' || field === 'email' || field === 'password' || field === 'organization') {
          setError(field, { message });
          handledField = true;
        }
      }
      if (!handledField) setFormError(getApiErrorMessage(error, 'Unable to create your account.'));
    }
  }

  return (
    <div>
      <div className="mb-7">
        <p className="mb-2 text-label-md font-semibold uppercase tracking-[0.16em] text-brand">Join CrowdPredict</p>
        <h1 className="text-headline-lg font-bold tracking-[-0.015em] text-ink">Create your account</h1>
        <p className="mt-2 text-body-sm text-muted">
          Back campaigns, launch your own, and use the prediction engine to plan with evidence.
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

        <div>
          <p className="mb-2 text-label-lg font-medium text-on-surface-variant">I want to join as a</p>
          <div className="grid grid-cols-2 gap-3" role="group" aria-label="Account role">
            {ROLES.map((role) => {
              const active = selectedRole === role.value;
              return (
                <button
                  key={role.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setValue('role', role.value, { shouldValidate: true })}
                  className={cn(
                    'rounded-xl border p-3 text-left transition-all duration-150',
                    active
                      ? 'border-brand bg-mint/35 ring-2 ring-brand/15'
                      : 'border-line/60 bg-white hover:border-brand/40 hover:bg-surface-low',
                  )}
                >
                  <span
                    className={cn(
                      'material-symbols-outlined mb-2 flex h-8 w-8 items-center justify-center rounded-full text-[18px]',
                      active ? 'bg-brand text-white' : 'bg-surface-container text-on-surface-variant',
                    )}
                    aria-hidden="true"
                  >
                    {role.icon}
                  </span>
                  <span className="block text-label-lg font-semibold text-ink">{role.title}</span>
                  <span className="mt-0.5 block text-label-md text-muted">{role.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        <FloatingLabelInput
          label="Full name"
          leadingIcon="person"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />
        <FloatingLabelInput
          label="Email address"
          type="email"
          leadingIcon="mail"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        {selectedRole === 'creator' ? (
          <FloatingLabelInput
            label="Organization"
            leadingIcon="business"
            autoComplete="organization"
            hint="Shown on your campaign pages."
            error={errors.organization?.message}
            {...register('organization')}
          />
        ) : null}
        <FloatingLabelInput
          label="Password"
          type="password"
          leadingIcon="lock"
          autoComplete="new-password"
          hint="At least 6 characters."
          error={errors.password?.message}
          {...register('password')}
        />
        <FloatingLabelInput
          label="Confirm password"
          type="password"
          leadingIcon="lock_reset"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <PillButton type="submit" size="lg" fullWidth loading={isSubmitting}>
          Create account
        </PillButton>
      </form>

      <p className="mt-5 text-center text-body-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
