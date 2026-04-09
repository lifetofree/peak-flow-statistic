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
  Link2,
  Eye,
} from 'lucide-react';
import ShareLinkCard from '../components/ShareLinkCard';
import { fetchUser, updateUser, updateNote, fetchAdminEntries, deleteUser, updateEntry } from '../api/admin';
import { formatThaiDate } from '../utils/date';
import { getBestReading } from '../utils/zone';

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
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [showNotePreview, setShowNotePreview] = useState(false);
  const [viewingNote, setViewingNote] = useState<{ note: string; date: string } | null>(null);
  const [entryForm, setEntryForm] = useState({
    date: '',
    peakFlowReadings: ['', '', ''] as [string, string, string],
    spO2: '',
    medicationTiming: 'before' as 'before' | 'after',
    period: 'morning' as 'morning' | 'evening',
    note: '',
  });
  const userQuery = useQuery({
    queryKey: ['adminUser', id],
    queryFn: () => fetchUser(id!),
    enabled: !!id,
  });

  const entriesQuery = useQuery({
    queryKey: ['adminEntries', id, dateFilter],
    queryFn: () => fetchAdminEntries(1, id, true, dateFilter.from, dateFilter.to),
    enabled: !!id,
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

  const totalPages = entriesQuery.data
    ? Math.ceil(entriesQuery.data.total / entriesQuery.data.pageSize)
    : 0;

  return (
    <div className="min-h-screen p-4 max-w-full mx-auto space-y-6 overflow-x-hidden">
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
        {entriesQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : !entriesQuery.data || entriesQuery.data.entries.length === 0 ? (
          <div className="text-center py-8 text-gray-500 italic border rounded-xl border-dashed">
            {t('entry.noEntries')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-3 py-3 font-semibold text-gray-600">{t('entry.date')}</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-600">{t('entry.period')}</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-600">{t('entry.peakFlow')}</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-600">{t('entry.spO2')}</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-600">{t('entry.medicationTiming')}</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-600">{t('entry.note')}</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entriesQuery.data.entries.map((entry) => (
                  <tr key={entry._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 whitespace-nowrap">{formatThaiDate(entry.date)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {entry.period === 'morning' ? (
                          <Sun className="text-orange-500" size={14} />
                        ) : (
                          <Moon className="text-indigo-600" size={14} />
                        )}
                        <span className="text-xs font-medium uppercase tracking-tight text-gray-500">
                          {t(`entry.${entry.period}`)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-medium">{getBestReading(entry.peakFlowReadings)}</span> L/min
                      <span className="text-xs text-gray-400 ml-1">
                        ({entry.peakFlowReadings.join('/')})
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        entry.spO2 >= 95 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {entry.spO2}%
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-gray-600">{t(`entry.${entry.medicationTiming}`)}</span>
                    </td>
                    <td className="px-3 py-3">
                      {entry.note ? (
                        entry.note.length > 30 ? (
                          <button
                            onClick={() => setViewingNote({ note: entry.note, date: formatThaiDate(entry.date) })}
                            className="text-xs text-blue-600 hover:underline text-left"
                          >
                            {entry.note.slice(0, 30)}...
                          </button>
                        ) : (
                          <span className="text-xs text-gray-600">{entry.note}</span>
                        )
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => startEditingEntry(entry)}
                        className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                        title={t('common.edit')}
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {editingEntry && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border space-y-3">
            <h4 className="font-semibold text-gray-700">{t('admin.editEntry') || 'Edit Entry'}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('entry.date')}</label>
                <input
                  type="date"
                  value={entryForm.date}
                  onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('entry.period')}</label>
                <div className="flex bg-white border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setEntryForm({ ...entryForm, period: 'morning' })}
                    className={`flex-1 py-2 text-xs font-medium ${
                      entryForm.period === 'morning' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'
                    }`}
                  >
                    {t('entry.morning')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryForm({ ...entryForm, period: 'evening' })}
                    className={`flex-1 py-2 text-xs font-medium ${
                      entryForm.period === 'evening' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'
                    }`}
                  >
                    {t('entry.evening')}
                  </button>
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">{t('entry.peakFlow')} (L/min)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((i) => (
                    <input
                      key={i}
                      type="number"
                      value={entryForm.peakFlowReadings[i]}
                      onChange={(e) => {
                        const newReadings = [...entryForm.peakFlowReadings] as [string, string, string];
                        newReadings[i] = e.target.value;
                        setEntryForm({ ...entryForm, peakFlowReadings: newReadings });
                      }}
                      className="border rounded-lg px-3 py-2 text-sm"
                      placeholder={`${t('entry.reading', { number: i + 1 })}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('entry.spO2')} (%)</label>
                <input
                  type="number"
                  value={entryForm.spO2}
                  onChange={(e) => setEntryForm({ ...entryForm, spO2: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('entry.medicationTiming')}</label>
                <div className="flex bg-white border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setEntryForm({ ...entryForm, medicationTiming: 'before' })}
                    className={`flex-1 py-2 text-xs font-medium ${
                      entryForm.medicationTiming === 'before' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'
                    }`}
                  >
                    {t('entry.before')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryForm({ ...entryForm, medicationTiming: 'after' })}
                    className={`flex-1 py-2 text-xs font-medium ${
                      entryForm.medicationTiming === 'after' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'
                    }`}
                  >
                    {t('entry.after')}
                  </button>
                </div>
              </div>
              <div className="col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs text-gray-500">{t('entry.note')}</label>
                  <button
                    type="button"
                    onClick={() => setShowNotePreview(!showNotePreview)}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {showNotePreview ? (
                      <>
                        <Edit2 size={12} />
                        {t('entry.editNote')}
                      </>
                    ) : (
                      <>
                        <Eye size={12} />
                        {t('entry.previewNote')}
                      </>
                    )}
                  </button>
                </div>
                {showNotePreview ? (
                  <div className="border rounded-lg px-3 py-2 min-h-[60px] bg-gray-50 prose prose-sm max-w-none">
                    {entryForm.note ? (
                      <ReactMarkdown>{entryForm.note}</ReactMarkdown>
                    ) : (
                      <p className="text-gray-400 italic">{t('entry.noNote')}</p>
                    )}
                  </div>
                ) : (
                  <textarea
                    value={entryForm.note}
                    onChange={(e) => setEntryForm({ ...entryForm, note: e.target.value })}
                    rows={2}
                    placeholder={t('entry.notePlaceholder')}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveEntry}
                disabled={updateEntryMutation.isPending}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-blue-700 disabled:opacity-50"
              >
                <Save size={14} />
                {updateEntryMutation.isPending ? t('common.loading') : t('common.save')}
              </button>
              <button
                onClick={() => { setEditingEntry(null); setShowNotePreview(false); }}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

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
                <ReactMarkdown>{viewingNote.note}</ReactMarkdown>
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
        ) : allEntries.length === 0 ? (
          <div className="text-center py-8 text-gray-500 italic border rounded-xl border-dashed">
            {t('entry.noEntries')}
          </div>
        ) : (
          <PeakFlowTable entries={allEntries} />
        )}
      </div>
    </div>
  );
}
