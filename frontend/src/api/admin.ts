import { adminFetch, apiFetch } from './client';
import type { User, Entry, AuditLog } from '../types';

export function login(password: string): Promise<{ token: string }> {
  return apiFetch('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export function fetchUsers(
  page: number,
  query?: string
): Promise<{ users: User[]; total: number; page: number; pageSize: number }> {
  const params = new URLSearchParams({ page: String(page) });
  if (query) params.set('q', query);
  return adminFetch(`/admin/users?${params}`);
}

export function fetchUser(id: string): Promise<User> {
  return adminFetch(`/admin/users/${id}`);
}

export function createUser(data: {
  firstName: string;
  lastName: string;
  nickname: string;
  personalBest?: number | null;
  adminNote?: string;
}): Promise<User> {
  return adminFetch('/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateUser(
  id: string,
  data: Partial<Pick<User, 'firstName' | 'lastName' | 'nickname' | 'personalBest' | 'shortCode'>>
): Promise<User> {
  return adminFetch(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteUser(id: string): Promise<void> {
  return adminFetch(`/admin/users/${id}`, { method: 'DELETE' });
}

export function updateNote(id: string, adminNote: string): Promise<User> {
  return adminFetch(`/admin/users/${id}/note`, {
    method: 'PATCH',
    body: JSON.stringify({ adminNote }),
  });
}

export function rotateToken(id: string): Promise<{ shortToken: string }> {
  return adminFetch(`/admin/users/${id}/rotate-token`, { method: 'POST' });
}

export function fetchAdminEntries(
  page: number,
  userId?: string,
  from?: string,
  to?: string
): Promise<{ entries: Entry[]; total: number; page: number; pageSize: number }> {
  const params = new URLSearchParams({ page: String(page) });
  if (userId) params.set('userId', userId);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return adminFetch(`/admin/entries?${params}`);
}

export function updateEntry(id: string, data: Partial<Entry>): Promise<Entry> {
  return adminFetch(`/admin/entries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteEntry(id: string): Promise<void> {
  return adminFetch(`/admin/entries/${id}`, { method: 'DELETE' });
}

export function fetchAuditLogs(
  page: number,
  userId?: string,
  action?: string
): Promise<{ logs: AuditLog[]; total: number; page: number; pageSize: number }> {
  const params = new URLSearchParams({ page: String(page) });
  if (userId) params.set('userId', userId);
  if (action) params.set('action', action);
  return adminFetch(`/admin/audit?${params}`);
}

export function getAdminExportUrl(userId: string): string {
  const api = import.meta.env.VITE_API_URL || '/api';
  return `${api}/admin/users/${userId}/export`;
}
