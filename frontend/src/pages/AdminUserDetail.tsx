import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { fetchUser, fetchAdminEntries, deleteUser, getAdminExportUrl } from '../api/admin';
import { groupEntriesByDate, convertGroupedToArray, getSortedDates } from '../utils/entryGrouping';
import UserProfile from '../components/admin/UserProfile';
import UserShareLink from '../components/admin/UserShareLink';
import UserAdminNote from '../components/admin/UserAdminNote';
import UserEntriesTable from '../components/admin/UserEntriesTable';
import NoteModal from '../components/admin/NoteModal';
import DateFilter from '../components/DateFilter';

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [entryPage, setEntryPage] = useState(1);
  const [viewingNote, setViewingNote] = useState<{ note: string; date: string } | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const daysPerPage = 20;
  const entriesPerPage = daysPerPage * 4;

  const userQuery = useQuery({
    queryKey: ['adminUser', id],
    queryFn: () => fetchUser(id!),
    enabled: Boolean(id),
  });

  const entriesQuery = useQuery({
    queryKey: ['adminEntries', id, entryPage, fromDate, toDate],
    queryFn: () => fetchAdminEntries(entryPage, id, entriesPerPage, fromDate || undefined, toDate || undefined),
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
      const exportUrl = getAdminExportUrl(id!, fromDate || undefined, toDate || undefined);
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

  const handleFromDateChange = (date: string) => {
    setFromDate(date);
    setEntryPage(1);
  };

  const handleToDateChange = (date: string) => {
    setToDate(date);
    setEntryPage(1);
  };

  const handleClearFilter = () => {
    setFromDate('');
    setToDate('');
    setEntryPage(1);
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

      <DateFilter
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={handleFromDateChange}
        onToDateChange={handleToDateChange}
        onClear={handleClearFilter}
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
          total={entriesQuery.data?.total ?? 0}
          entryPage={entryPage}
          entriesPerPage={entriesPerPage}
          onPageChange={setEntryPage}
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
