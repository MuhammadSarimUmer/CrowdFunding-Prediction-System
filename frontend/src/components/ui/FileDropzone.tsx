import { useId, useRef, useState, type DragEvent } from 'react';
import { cn } from '@/lib/cn';

interface FileDropzoneProps {
  onFile: (file: File) => void;
  file?: File | null;
  onClear?: () => void;
  onError?: (message: string) => void;
  accept?: string;
  maxSizeMB?: number;
  disabled?: boolean;
  error?: string;
  hint?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDropzone({
  onFile,
  file,
  onClear,
  onError,
  accept = '.csv',
  maxSizeMB = 50,
  disabled = false,
  error,
  hint = 'CSV up to 50 MB. Rows must include campaign outcome and feature columns.',
}: FileDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function validateAndEmit(candidate: File) {
    if (!candidate.name.toLowerCase().endsWith('.csv')) {
      onError?.('Only CSV files are supported.');
      return;
    }
    if (candidate.size > maxSizeMB * 1024 * 1024) {
      onError?.(`Datasets must be ${maxSizeMB} MB or smaller.`);
      return;
    }
    onFile(candidate);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) validateAndEmit(dropped);
  }

  if (file) {
    return (
      <div className="rounded-card border border-brand/25 bg-mint/20 p-5">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined mt-0.5 text-[26px] text-brand" aria-hidden="true">
            description
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm font-semibold text-ink">{file.name}</p>
            <p className="mt-0.5 text-label-md text-muted">{formatSize(file.size)} · Ready to upload</p>
          </div>
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="rounded-full p-1.5 text-muted transition hover:bg-white hover:text-danger"
              aria-label="Remove selected file"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                close
              </span>
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed px-6 py-10 text-center transition-all duration-150',
          dragging ? 'border-brand bg-mint/30' : 'border-line/70 bg-surface-low/50 hover:border-brand/60 hover:bg-mint/15',
          error && 'border-danger/70 bg-error-container/30',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        <span
          className={cn(
            'material-symbols-outlined mb-3 flex h-12 w-12 items-center justify-center rounded-full text-[26px]',
            dragging ? 'bg-brand text-white' : 'bg-white text-brand shadow-paper',
          )}
          aria-hidden="true"
        >
          upload_file
        </span>
        <p className="text-body-sm font-semibold text-ink">
          {dragging ? 'Drop the CSV to attach it' : 'Drag and drop a dataset, or browse'}
        </p>
        <p className="mt-1 max-w-sm text-label-md text-muted">{hint}</p>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          disabled={disabled}
          className="sr-only"
          onChange={(event) => {
            const selected = event.target.files?.[0];
            if (selected) validateAndEmit(selected);
            event.target.value = '';
          }}
        />
      </label>
      {error ? (
        <p className="mt-2 flex items-center gap-1 text-label-md font-medium text-danger" role="alert">
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
            error
          </span>
          {error}
        </p>
      ) : null}
    </div>
  );
}
