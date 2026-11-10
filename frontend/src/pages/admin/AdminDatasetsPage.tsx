import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Dataset } from '@/types';
import { adminApi } from '@/api';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage } from '@/lib/api';
import { formatDate, formatNumber } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { AdminTabs } from '@/components/layout/AdminTabs';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { PillButton } from '@/components/ui/PillButton';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Chip, statusTone } from '@/components/ui/Chip';

export function AdminDatasetsPage() {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Dataset | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: datasets, isLoading } = useQuery({
    queryKey: ['admin', 'datasets'],
    queryFn: adminApi.datasets,
  });

  const items = [...(datasets ?? [])].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  );
  const totalRows = items.reduce((sum, dataset) => sum + dataset.rowCount, 0);
  const latest = items[0];
  const archived = items.filter((dataset) => dataset.status === 'archived').length;

  function closeUpload() {
    if (uploading) return;
    setUploadOpen(false);
    setFile(null);
    setUploadError(null);
    setProgress(0);
  }

  async function upload() {
    if (!file) {
      setUploadError('Choose a CSV file before uploading.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    setProgress(8);
    const timer = window.setInterval(() => {
      setProgress((current) => Math.min(90, current + 5 + Math.random() * 8));
    }, 240);
    try {
      const dataset = await adminApi.uploadDataset(file);
      setProgress(100);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'datasets'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] }),
      ]);
      success(`${dataset.fileName} uploaded with ${formatNumber(dataset.rowCount)} rows.`);
      window.setTimeout(() => {
        setUploadOpen(false);
        setFile(null);
        setProgress(0);
      }, 450);
    } catch (uploadFailure) {
      setUploadError(getApiErrorMessage(uploadFailure, 'Unable to upload this dataset.'));
    } finally {
      window.clearInterval(timer);
      setUploading(false);
    }
  }

  async function removeDataset() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteDataset(deleteTarget.datasetId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'datasets'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] }),
      ]);
      success(`${deleteTarget.fileName} removed.`);
      setDeleteTarget(null);
    } catch (deleteFailure) {
      toastError(getApiErrorMessage(deleteFailure, 'Unable to remove this dataset.'));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const columns: Array<Column<Dataset>> = [
    {
      key: 'file',
      header: 'Dataset',
      render: (dataset) => (
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined flex h-10 w-10 items-center justify-center rounded-lg bg-mint/40 text-[20px] text-brand" aria-hidden="true">
            description
          </span>
          <div className="min-w-0">
            <p className="max-w-[300px] truncate text-body-sm font-semibold text-ink">{dataset.fileName}</p>
            <p className="text-label-md text-muted">
              {dataset.features ?? 18} features · uploaded by {dataset.uploadedBy ?? 'admin'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'rows',
      header: 'Rows',
      align: 'right',
      render: (dataset) => <span className="font-mono text-label-lg">{formatNumber(dataset.rowCount)}</span>,
    },
    {
      key: 'uploaded',
      header: 'Uploaded',
      render: (dataset) => <span className="whitespace-nowrap">{formatDate(dataset.uploadedAt)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (dataset) => (
        <Chip tone={statusTone(dataset.status)}>{dataset.status ?? 'validated'}</Chip>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (dataset) => (
        <button
          type="button"
          onClick={() => setDeleteTarget(dataset)}
          className="inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-label-md font-semibold text-danger transition hover:bg-error-container/40"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
            delete
          </span>
          Remove
        </button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Admin console"
        title="Datasets"
        description="Upload and manage the CSV corpus used to train campaign outcome models."
        actions={
          <PillButton icon="upload_file" onClick={() => setUploadOpen(true)}>
            Upload dataset
          </PillButton>
        }
      />
      <AdminTabs />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Datasets" value={items.length} icon="database" hint="In the training corpus" />
        <StatCard label="Training rows" value={formatNumber(totalRows)} icon="table_rows" tone="gold" hint="Across all datasets" />
        <StatCard
          label="Latest upload"
          value={latest ? formatDate(latest.uploadedAt) : '—'}
          icon="schedule"
          tone="neutral"
          hint={latest?.fileName ?? 'No uploads yet'}
        />
        <StatCard label="Archived" value={archived} icon="archive" tone="neutral" hint="Retained but not active" />
      </div>

      <div className="mt-8">
        {items.length === 0 && !isLoading ? (
          <EmptyState
            icon="database"
            title="No datasets yet"
            description="Upload a CSV with campaign outcomes and feature columns to start training models."
            action={
              <PillButton icon="upload_file" onClick={() => setUploadOpen(true)}>
                Upload your first dataset
              </PillButton>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(dataset) => dataset.datasetId}
            loading={isLoading}
            emptyTitle="No datasets yet"
          />
        )}
      </div>

      <Modal
        open={uploadOpen}
        onClose={closeUpload}
        title="Upload a dataset"
        description="CSV only, up to 50 MB. The file is validated before it enters the corpus."
        footer={
          <>
            <PillButton variant="ghost" onClick={closeUpload} disabled={uploading}>
              Cancel
            </PillButton>
            <PillButton icon="cloud_upload" onClick={() => void upload()} loading={uploading} disabled={!file}>
              Upload dataset
            </PillButton>
          </>
        }
      >
        <div className="space-y-4">
          <FileDropzone
            file={file}
            onFile={(selected) => {
              setFile(selected);
              setUploadError(null);
            }}
            onClear={() => {
              setFile(null);
              setProgress(0);
            }}
            onError={(message) => setUploadError(message)}
            error={uploadError ?? undefined}
            disabled={uploading}
          />
          {uploading || progress > 0 ? (
            <ProgressBar
              value={progress}
              showValue
              label={progress >= 100 ? 'Dataset validated' : 'Uploading and validating'}
            />
          ) : null}
          <div className="rounded-xl bg-surface-low px-4 py-3 text-label-md text-muted">
            <p className="flex items-start gap-2">
              <span className="material-symbols-outlined mt-0.5 text-[18px] text-brand" aria-hidden="true">
                info
              </span>
              Required columns include campaign outcome, goal, duration, reward count, and text length. The mock adapter
              records the file name and a generated row count.
            </p>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove this dataset?"
        description={`${deleteTarget?.fileName ?? 'This dataset'} will be removed from the corpus. Datasets already used by a trained model cannot be removed.`}
        confirmLabel="Remove dataset"
        tone="danger"
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void removeDataset()}
      />
    </div>
  );
}
