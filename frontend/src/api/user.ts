import { apiFetch } from './client';
import type { UserProfile, EntryWithZone, CreateEntryInput } from '../types';

export function fetchUserProfile(token: string): Promise<UserProfile> {
  return apiFetch<UserProfile>(`/u/${token}`);
}

export function fetchUserEntries(
  token: string,
  pageSize?: number,
  from?: string,
  to?: string
): Promise<{ entries: EntryWithZone[]; total: number; page: number; pageSize: number }> {
  const params = new URLSearchParams();
  if (pageSize !== undefined) params.set('pageSize', String(pageSize));
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return apiFetch(`/u/${token}/entries?${params}`);
}

export function createEntry(
  token: string,
  data: CreateEntryInput
): Promise<EntryWithZone> {
  return apiFetch('/u/' + token + '/entries', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getExportUrl(token: string, from?: string, to?: string): string {
  const api = import.meta.env.VITE_API_URL || '/api';
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();
  return `${api}/u/${token}/export${qs ? '?' + qs : ''}`;
}
