import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import {
  ChevronLeft,
  Edit2,
  Trash2,
  FileDown,
  Save,
  X,
  User as UserIcon,
  StickyNote,
  History,
  Sun,
  Moon,
  Link2,
  FileText,
  Calendar,
} from 'lucide-react';
import ShareLinkCard from '../components/ShareLinkCard';
import { fetchUser, updateUser, updateNote, fetchAdminEntries, deleteUser } from '../api/admin';
import { formatThaiDate } from '../utils/date';

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', nickname: '', personalBest: '' });
  const [noteText, setNoteText] = useState('');
  const [entryPage, setEntryPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewingNote, setViewingNote] = useState<{ note: string; date: string } | null>(null);
  const today = new Date().toISOString().split('T')[0];
  const pageSize = 20;

  const userQuery = useQuery({
    queryKey: ['adminUser', id],
    queryFn: () => fetchUser(id!),
    enabled: Boolean(id),
  });

  const entriesQuery = useQuery({
    queryKey: ['adminEntries', id, entryPage, dateFrom, dateTo],
    queryFn: () => fetchAdminEntries(entryPage, id, dateFrom || undefined, dateTo || undefined),
    enabled: Boolean(id),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateUser(id!, {
        firstName: form.firstName,
        lastName: form.lastName,
        nickname: form.nickname,
        personalBest: form.personalBest ? Number(form.personalBest) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUser', id] });
      setEditing(false);
    },
    onError: (error: any) => {
      alert(error.message || t('common.error'));
    }
  });

  const noteMutation = useMutation({
    mutationFn: () => updateNote(id!, noteText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUser', id] });
      setEditingNote(false);
    },
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
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || '/api'}/admin/users/${id}/export`,
        { headers }
      );
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

  const startEditing = () => {
    if (!userQuery.data) return;
    const u = userQuery.data;
    setForm({
      firstName: u.firstName,
      lastName: u.lastName,
      nickname: u.nickname,
      personalBest: u.personalBest ? String(u.personalBest) : '',
    });
    setEditing(true);
  };

  const startEditingNote = () => {
    setNoteText(userQuery.data?.adminNote || '');
    setEditingNote(true);
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

  // Group entries by date, period, and medication timing, keeping latest entry per combination
  const groupedEntries = entriesQuery.data?.entries.reduce((acc, entry) => {
    const dateKey = entry.date.split('T')[0];
    const periodKey = entry.period;
    const medKey = entry.medicationTiming;
    const key = `${dateKey}-${periodKey}-${medKey}`;
    
    if (!acc[key] || new Date(entry.createdAt) > new Date(acc[key].createdAt)) {
      acc[key] = entry;
    }
    return acc;
  }, {} as Record<string, any>);

  // Group by date for display
  const entriesByDate = Object.values(groupedEntries || {}).reduce((acc, entry) => {
    const dateKey = entry.date.split('T')[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(entry);
    return acc;
  }, {} as Record<string, any[]>);

  // Sort dates descending (newest first)
  const sortedDates = Object.keys(entriesByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/admin" className="text-blue-600 hover:underline flex items-center gap-1">
          <ChevronLeft size={20} />
          {t('common.back')}
        </Link>
        <button
          onClick={() => {
            if (confirm(t('common.confirm') + '?')) deleteMutation.mutate();
          }}
          className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
        >
          <Trash2 size={16} />
          {t('admin.deleteUser')}
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border space-y-4">
        {editing ? (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Edit2 size={20} className="text-blue-600" />
              {t('admin.editUser')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder={t('admin.firstName')}
              />
              <input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder={t('admin.lastName')}
              />
              <input
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder={t('admin.nickname')}
              />
              <input
                type="number"
                placeholder={t('admin.personalBest')}
                value={form.personalBest}
                onChange={(e) => setForm({ ...form, personalBest: e.target.value })}
                className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => updateMutation.mutate()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-blue-700 transition-colors"
              >
                <Save size={16} />
                {t('common.save')}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-gray-200 transition-colors"
              >
                <X size={16} />
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-3 rounded-full">
                  <UserIcon size={24} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {user.firstName} {user.lastName} ({user.nickname})
                  </h2>
                  <p className="text-sm text-gray-500">
                    {t('admin.personalBest')}: <span className="font-semibold text-gray-700">{user.personalBest ? `${user.personalBest} L/min` : '-'}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1 uppercase font-medium">
                    Code: {user.shortCode}
                  </p>
                </div>
              </div>
              <button
                onClick={startEditing}
                className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                title={t('common.edit')}
              >
                <Edit2 size={20} />
              </button>
            </div>
            
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={handleExport}
                className="bg-white border text-green-600 hover:bg-green-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
              >
                <FileDown size={16} />
                {t('admin.export')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Share Link */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
          <Link2 size={20} className="text-blue-600" />
          {t('admin.shareLink')}
        </h3>
        <ShareLinkCard shortCode={user.shortCode} />
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <StickyNote size={20} className="text-yellow-600" />
            {t('admin.adminNote')}
          </h3>
          {!editingNote && (
            <button 
              onClick={startEditingNote} 
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              <Edit2 size={14} />
              {t('common.edit')}
            </button>
          )}
        </div>
        {editingNote ? (
          <div className="space-y-3">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={6}
              className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => noteMutation.mutate()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-blue-700 transition-colors"
              >
                <Save size={16} />
                {t('common.save')}
              </button>
              <button
                onClick={() => setEditingNote(false)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-gray-200 transition-colors"
              >
                <X size={16} />
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none bg-gray-50 p-4 rounded-xl border border-dashed">
            {user.adminNote ? (
              <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{user.adminNote}</ReactMarkdown>
            ) : (
              <p className="text-gray-400 italic">{t('common.noData')}</p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <History size={20} className="text-purple-600" />
          {t('admin.entries')}
        </h3>
        
        {/* Date Filter */}
        <div className="flex items-center gap-2 mb-4 pb-4 border-b">
          <Calendar size={16} className="text-gray-400" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setEntryPage(1); }}
            max={dateTo || today}
            className="text-sm border rounded-lg px-2 py-1"
          />
          <span className="text-gray-400 text-sm">-</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setEntryPage(1); }}
            max={today}
            min={dateFrom}
            className="text-sm border rounded-lg px-2 py-1"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setEntryPage(1); }}
              className="text-xs text-gray-500 hover:text-gray-700 ml-2"
            >
              {t('common.clear')}
            </button>
          )}
        </div>

        {entriesQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : !entriesQuery.data || Object.keys(entriesByDate).length === 0 ? (
          <div className="text-center py-8 text-gray-500 italic border rounded-xl border-dashed">
            {t('entry.noEntries')}
          </div>
        ) : (() => {
              const totalDates = sortedDates.length;
              const totalPages = Math.ceil(totalDates / pageSize);
              const startIdx = (entryPage - 1) * pageSize;
              const endIdx = startIdx + pageSize;
              const paginatedDates = sortedDates.slice(startIdx, endIdx);
              
              if (totalDates === 0) return null;
              
              return (
                <>
                  <div className="overflow-x-auto border rounded-xl">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-2 py-2 font-semibold text-gray-600 border-r border-gray-300">Date</th>
                          <th className="px-2 py-2 text-center text-orange-700 font-bold border-r border-orange-200">
                            <div className="flex items-center justify-center gap-1">
                              <Sun className="text-orange-500" size={12} />
                              <span>Morning - Before Med</span>
                            </div>
                          </th>
                          <th className="px-2 py-2 text-center text-purple-700 font-bold border-r border-purple-200">
                            <div className="flex items-center justify-center gap-1">
                              <Sun className="text-orange-500" size={12} />
                              <span>Morning - After Med</span>
                            </div>
                          </th>
                          <th className="px-2 py-2 text-center text-indigo-700 font-bold border-r border-indigo-200">
                            <div className="flex items-center justify-center gap-1">
                              <Moon className="text-indigo-600" size={12} />
                              <span>Evening - Before Med</span>
                            </div>
                          </th>
                          <th className="px-2 py-2 text-center text-blue-700 font-bold">
                            <div className="flex items-center justify-center gap-1">
                              <Moon className="text-indigo-600" size={12} />
                              <span>Evening - After Med</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {paginatedDates.map((dateKey) => {
                          const dateEntries = entriesByDate[dateKey] || [];
                          const morningBeforeEntry = dateEntries.find((e: any) => e.period === 'morning' && e.medicationTiming === 'before');
                          const morningAfterEntry = dateEntries.find((e: any) => e.period === 'morning' && e.medicationTiming === 'after');
                          const eveningBeforeEntry = dateEntries.find((e: any) => e.period === 'evening' && e.medicationTiming === 'before');
                          const eveningAfterEntry = dateEntries.find((e: any) => e.period === 'evening' && e.medicationTiming === 'after');

                          // Combined cell: PF (3 values) / SpO2 / Note icon
                          const renderCell = (entry: any) => {
                            if (!entry) return <span className="text-gray-300">-</span>;
                            const pf = entry.peakFlowReadings?.join('/') || '-';
                            return (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs">{pf}</span>
                                <span className={`px-1 py-0.5 rounded text-xs font-bold ${
                                  entry.spO2 >= 95 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {entry.spO2}
                                </span>
                                {entry.note && (
                                  <button
                                    onClick={() => setViewingNote({ note: entry.note, date: formatThaiDate(entry.date) })}
                                    className="text-gray-400 hover:text-blue-600 transition-colors"
                                  >
                                    <FileText size={12} />
                                  </button>
                                )}
                              </div>
                            );
                          };

                          return (
                            <tr key={dateKey} className="hover:bg-gray-50 transition-colors">
                              <td className="px-2 py-2 whitespace-nowrap font-medium text-gray-700 border-r border-gray-200">
                                {formatThaiDate(dateEntries[0].date)}
                              </td>
                              <td className="px-2 py-2 text-center border-r border-orange-200 bg-orange-50/20">{renderCell(morningBeforeEntry)}</td>
                              <td className="px-2 py-2 text-center border-r border-purple-200 bg-purple-50/20">{renderCell(morningAfterEntry)}</td>
                              <td className="px-2 py-2 text-center border-r border-indigo-200 bg-indigo-50/20">{renderCell(eveningBeforeEntry)}</td>
                              <td className="px-2 py-2 text-center bg-blue-50/20">{renderCell(eveningAfterEntry)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-4">
                      <button
                        onClick={() => setEntryPage((p) => Math.max(1, p - 1))}
                        disabled={entryPage === 1}
                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <span className="text-sm font-medium text-gray-600">
                        {entryPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setEntryPage((p) => Math.min(totalPages, p + 1))}
                        disabled={entryPage === totalPages}
                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                      >
                        <ChevronLeft size={20} className="rotate-180" />
                      </button>
                    </div>
                  )}
                </>
              );
            })()}

        {viewingNote && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-auto">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-bold">{t('entry.note')} - {viewingNote.date}</h3>
                <button
                  onClick={() => setViewingNote(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 prose prose-sm max-w-none">
                <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{viewingNote.note}</ReactMarkdown>
              </div>
              <div className="p-4 border-t">
                <button
                  onClick={() => setViewingNote(null)}
                  className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
