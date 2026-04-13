import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { fetchUser, fetchAdminEntries, deleteUser, getAdminExportUrl } from '../api/admin';
import { groupEntriesByDate, convertGroupedToArray } from '../utils/entryGrouping';
import UserProfile from '../components/admin/UserProfile';
import UserShareLink from '../components/admin/UserShareLink';
import UserAdminNote from '../components/admin/UserAdminNote';
import UserEntriesTable from '../components/admin/UserEntriesTable';
import NoteModal from '../components/admin/NoteModal';

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [viewingNote, setViewingNote] = useState<{ note: string; date: string } | null>(null);

  const userQuery = useQuery({
    queryKey: ['adminUser', id],
    queryFn: () => fetchUser(id!),
    enabled: Boolean(id),
  });

  const entriesQuery = useQuery({
    queryKey: ['adminEntries', id],
    queryFn: () => fetchAdminEntries(1, id, 0),
    enabled: Boolean(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteUser(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      navigate('/admin');
    },
  });

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const exportUrl = getAdminExportUrl(id!);
      const res = await fetch(exportUrl, { headers });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `entries-${userQuery.data?.nickname || 'user'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert(t('common.error'));
    }
  };

  const handleDelete = () => {
    if (confirm(t('common.confirm') + '?')) {
      deleteMutation.mutate();
    }
  };

  if (userQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const user = userQuery.data;
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-red-500">{t('common.error')}</p>
      </div>
    );
  }

  const allEntries = entriesQuery.data?.entries ?? [];
  const groupedEntries = groupEntriesByDate(allEntries);
  const entriesByDate = convertGroupedToArray(groupedEntries);

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/admin" className="text-blue-600 hover:underline flex items-center gap-1">
          <ChevronLeft size={20} />
          {t('common.back')}
        </Link>
        <button
          onClick={handleDelete}
          className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
        >
          <Trash2 size={16} />
          {t('admin.deleteUser')}
        </button>
      </div>

      <UserProfile
        user={user}
        queryClient={queryClient}
        onDelete={handleDelete}
        onExport={handleExport}
      />

      <UserShareLink shortCode={user.shortCode} />

      <UserAdminNote
        userId={user._id}
        adminNote={user.adminNote || ''}
        queryClient={queryClient}
      />

      {entriesQuery.isLoading ? (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </div>
      ) : (
        <UserEntriesTable
          entriesByDate={entriesByDate}
          onViewNote={(note, date) => setViewingNote({ note, date })}
        />
      )}

      {viewingNote && (
        <NoteModal
          note={viewingNote.note}
          date={viewingNote.date}
          onClose={() => setViewingNote(null)}
        />
      )}
    </div>
  );
}
