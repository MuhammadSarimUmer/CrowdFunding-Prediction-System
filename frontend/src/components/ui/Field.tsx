import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/cn';

interface BaseFieldProps {
  label: string;
  error?: string;
  hint?: string;
  leadingIcon?: string;
}

type InputProps = BaseFieldProps & InputHTMLAttributes<HTMLInputElement>;

export const FloatingLabelInput = forwardRef<HTMLInputElement, InputProps>(function FloatingLabelInput(
  { label, error, hint, leadingIcon, id, className, ...rest },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  return (
    <div className="w-full">
      <div className="relative">
        {leadingIcon ? (
          <span
            className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[20px] text-outline"
            aria-hidden="true"
          >
            {leadingIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={fieldId}
          placeholder=" "
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            'peer h-14 w-full rounded-xl border bg-white px-4 pb-1.5 pt-5 text-body-md text-ink outline-none transition-all duration-150 placeholder:text-transparent',
            leadingIcon ? 'pl-11' : 'pl-4',
            error
              ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/15'
              : 'border-line/70 focus:border-brand focus:ring-2 focus:ring-brand/15',
            className,
          )}
          {...rest}
        />
        <label
          htmlFor={fieldId}
          className={cn(
            'pointer-events-none absolute top-1/2 -translate-y-1/2 text-body-sm text-muted transition-all duration-150',
            leadingIcon ? 'left-11' : 'left-4',
            'peer-focus:top-3 peer-focus:translate-y-0 peer-focus:text-label-md peer-focus:text-brand',
            'peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-label-md',
            error && 'text-danger peer-focus:text-danger',
          )}
        >
          {label}
        </label>
      </div>
      {error ? (
        <p id={`${fieldId}-error`} className="mt-1.5 flex items-center gap-1 text-label-md font-medium text-danger" role="alert">
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
            error
          </span>
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="mt-1.5 text-label-md text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

type TextAreaProps = BaseFieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

export const FloatingLabelTextarea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function FloatingLabelTextarea({ label, error, hint, id, className, ...rest }, ref) {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

    return (
      <div className="w-full">
        <div className="relative">
          <textarea
            ref={ref}
            id={fieldId}
            placeholder=" "
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={cn(
              'peer min-h-[140px] w-full resize-y rounded-xl border bg-white px-4 pb-3 pt-7 text-body-md text-ink outline-none transition-all duration-150 placeholder:text-transparent',
              error
                ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/15'
                : 'border-line/70 focus:border-brand focus:ring-2 focus:ring-brand/15',
              className,
            )}
            {...rest}
          />
          <label
            htmlFor={fieldId}
            className={cn(
              'pointer-events-none absolute left-4 top-5 text-body-sm text-muted transition-all duration-150',
              'peer-focus:top-2 peer-focus:text-label-md peer-focus:text-brand',
              'peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-label-md',
              error && 'text-danger peer-focus:text-danger',
            )}
          >
            {label}
          </label>
        </div>
        {error ? (
          <p id={`${fieldId}-error`} className="mt-1.5 flex items-center gap-1 text-label-md font-medium text-danger" role="alert">
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
              error
            </span>
            {error}
          </p>
        ) : hint ? (
          <p id={`${fieldId}-hint`} className="mt-1.5 text-label-md text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, id, className, children, ...rest },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  return (
    <div className="w-full">
      <label htmlFor={fieldId} className="mb-1.5 block text-label-lg font-medium text-on-surface-variant">
        {label}
      </label>
      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            'h-12 w-full appearance-none rounded-xl border bg-white px-4 pr-10 text-body-md text-ink outline-none transition-all duration-150',
            error
              ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/15'
              : 'border-line/70 focus:border-brand focus:ring-2 focus:ring-brand/15',
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        <span
          className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-outline"
          aria-hidden="true"
        >
          expand_more
        </span>
      </div>
      {error ? (
        <p id={`${fieldId}-error`} className="mt-1.5 flex items-center gap-1 text-label-md font-medium text-danger" role="alert">
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
            error
          </span>
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="mt-1.5 text-label-md text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
