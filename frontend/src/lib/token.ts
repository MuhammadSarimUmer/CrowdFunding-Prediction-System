const TOKEN_KEY = 'cp_token';
const USER_KEY = 'cp_user';

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Storage can be unavailable in private browsing; the app still works in-memory.
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // ignore
    }
  },
};

export const userCache = {
  get<T>(): T | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  set(value: unknown): void {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(value));
    } catch {
      // ignore
    }
  },
};
