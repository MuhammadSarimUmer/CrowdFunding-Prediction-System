import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import type { ApiErrorShape } from '@/types';
import { tokenStore } from '@/lib/token';
import { mockAdapter } from '@/lib/mock/adapter';

const useMock = String(import.meta.env.VITE_USE_MOCK ?? 'true').trim().toLowerCase() !== 'false';
const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export const REQUEST_TIMEOUT = 20_000;
export const UPLOAD_TIMEOUT = 120_000;
export const TRAINING_TIMEOUT = 300_000;

const STATUS_MESSAGES: Record<number, string> = {
  400: 'The request could not be processed.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to do that.',
  404: 'We could not find what you requested.',
  409: 'That action conflicts with the current state.',
  413: 'The file is too large.',
  422: 'Please check the highlighted fields.',
  429: 'Too many requests. Please wait and try again.',
  500: 'The server ran into a problem. Please try again.',
  502: 'The server is temporarily unavailable.',
  503: 'The service is temporarily unavailable.',
};

type UnknownRecord = Record<string, unknown>;

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { Accept: 'application/json' },
  timeout: REQUEST_TIMEOUT,
  ...(useMock ? { adapter: mockAdapter } : {}),
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorShape>) => {
    const status = error.response?.status;
    const url = error.config?.url ?? '';
    const isAuthAttempt = /\/auth\/(login|register)$/.test(url);
    if (status === 401 && !isAuthAttempt) {
      tokenStore.clear();
      window.dispatchEvent(new Event('cp:unauthorized'));
    }
    return Promise.reject(error);
  },
);

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await api.get<T>(url, config);
  return data;
}

export async function apiPost<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await api.post<T>(url, body, config);
  return data;
}

export async function apiPut<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await api.put<T>(url, body, config);
  return data;
}

export async function apiPatch<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await api.patch<T>(url, body, config);
  return data;
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await api.delete<T>(url, config);
  return data;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function normalizeFieldKey(key: string): string {
  return key
    .replace(/^body\./, '')
    .replace(/^data\./, '')
    .replace(/\[(\d+)\]/g, '.$1');
}

function fieldErrorMap(input: unknown): Record<string, string> {
  const output: Record<string, string> = {};

  const add = (key: string, value: unknown) => {
    const message = Array.isArray(value)
      ? firstString(...value)
      : value && typeof value === 'object'
        ? firstString((value as UnknownRecord).message, (value as UnknownRecord).msg)
        : firstString(value);
    if (!message) return;
    const normalized = normalizeFieldKey(key);
    if (normalized && !output[normalized]) output[normalized] = message;
  };

  if (Array.isArray(input)) {
    for (const item of input) {
      if (typeof item === 'string') {
        if (!output._form) output._form = item;
        continue;
      }
      if (!item || typeof item !== 'object') continue;
      const record = item as UnknownRecord;
      const loc = Array.isArray(record.loc)
        ? record.loc
            .filter((part): part is string | number => typeof part === 'string' || typeof part === 'number')
            .join('.')
        : undefined;
      const path = Array.isArray(record.path)
        ? record.path
            .filter((part): part is string | number => typeof part === 'string' || typeof part === 'number')
            .join('.')
        : undefined;
      const constraints =
        record.constraints && typeof record.constraints === 'object'
          ? firstString(...Object.values(record.constraints as UnknownRecord))
          : undefined;
      const key = firstString(record.field, record.path, record.name, record.property, path, loc);
      const message = firstString(record.message, record.msg, record.error, record.detail, constraints);
      if (key && message) add(key, message);
      else if (message && !output._form) output._form = message;
    }
    return output;
  }

  if (input && typeof input === 'object') {
    for (const [key, value] of Object.entries(input as UnknownRecord)) add(key, value);
  }

  return output;
}

function getFieldErrorsFromData(record: UnknownRecord): Record<string, string> {
  const sources = [
    record.errors,
    record.validationErrors,
    record.violations,
    Array.isArray(record.detail) ? record.detail : undefined,
  ];
  const merged: Record<string, string> = {};
  for (const source of sources) {
    for (const [key, value] of Object.entries(fieldErrorMap(source))) {
      if (!merged[key]) merged[key] = value;
    }
  }
  return merged;
}

function extractMessage(data: unknown): string | undefined {
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (!trimmed || trimmed.startsWith('<') || trimmed.length > 300) return undefined;
    return trimmed;
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const message = extractMessage(item);
      if (message) return message;
    }
    return undefined;
  }

  if (!data || typeof data !== 'object') return undefined;

  const record = data as UnknownRecord;
  const direct = firstString(record.message, record.detail, record.error, record.title);
  if (direct) return direct;

  const fields = getFieldErrorsFromData(record);
  return Object.values(fields)[0];
}

export function getApiErrorMessage(error: unknown, fallback = DEFAULT_ERROR_MESSAGE): string {
  if (!axios.isAxiosError<ApiErrorShape>(error)) {
    return error instanceof Error && error.message ? error.message : fallback;
  }

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return 'The request timed out. Please try again.';
  }

  const response = error.response;
  if (!response) {
    return fallback === DEFAULT_ERROR_MESSAGE
      ? 'Unable to reach the server. Check your connection and try again.'
      : fallback;
  }

  return extractMessage(response.data) ?? STATUS_MESSAGES[response.status] ?? fallback;
}

export function getApiFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError<ApiErrorShape>(error)) return {};
  const data = error.response?.data;
  if (Array.isArray(data)) return fieldErrorMap(data);
  if (!data || typeof data !== 'object') return {};
  return getFieldErrorsFromData(data as UnknownRecord);
}

export function getApiStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) return error.response?.status;
  return undefined;
}
