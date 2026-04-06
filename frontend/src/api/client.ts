const API_URL = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(res.status, body.error || 'Unknown error');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('adminToken');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function adminFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  return apiFetch<T>(path, {
    ...options,
    headers: {
      ...authHeaders(),
      ...options.headers,
    },
  });
}
