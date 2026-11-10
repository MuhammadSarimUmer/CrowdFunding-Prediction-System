import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { PillButton } from './PillButton';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-house/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close dialog"
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          'relative z-10 w-full animate-scale-in overflow-hidden rounded-panel bg-card shadow-modal',
          SIZES[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line/40 px-6 py-5">
          <div>
            <h2 id="modal-title" className="text-headline-sm font-semibold text-ink">
              {title}
            </h2>
            {description ? <p className="mt-1 text-body-sm text-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted transition hover:bg-surface-container hover:text-ink"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              close
            </span>
          </button>
        </div>
        {children ? <div className="max-h-[65vh] overflow-y-auto px-6 py-5">{children}</div> : null}
        {footer ? <div className="flex justify-end gap-3 border-t border-line/40 bg-surface-low/60 px-6 py-4">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
  tone?: 'primary' | 'danger' | 'gold';
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
  loading = false,
  tone = 'primary',
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <PillButton variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </PillButton>
          <PillButton variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </PillButton>
        </>
      }
    >
      <p className="text-body-sm text-on-surface-variant">{description}</p>
    </Modal>
  );
}
