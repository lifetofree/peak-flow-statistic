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
  Calendar,
} from 'lucide-react';
import ShareLinkCard from '../components/ShareLinkCard';
import PeakFlowTable from '../components/PeakFlowTable';
import { fetchUser, updateUser, updateNote, fetchAdminEntries, deleteUser } from '../api/admin';

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', nickname: '', personalBest: '' });
  const [noteText, setNoteText] = useState('');
  const [dateFilter, setDateFilter] = useState<{ from?: string; to?: string }>({});
  const [showDateFilter, setShowDateFilter] = useState(false);

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

  const allEntries = entriesQuery.data?.entries ?? [];

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
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <History size={20} className="text-purple-600" />
            {t('admin.entries')}
          </h3>
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className={`p-1.5 rounded-md transition-colors ${showDateFilter ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            title="Filter by date"
          >
            <Calendar size={18} />
          </button>
        </div>
        {showDateFilter && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('entry.from')}</label>
                <input
                  type="date"
                  value={dateFilter.from || ''}
                  onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value || undefined })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('entry.to')}</label>
                <input
                  type="date"
                  value={dateFilter.to || ''}
                  onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value || undefined })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setDateFilter({}); setShowDateFilter(false); }}
                className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => setShowDateFilter(false)}
                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        )}
        {entriesQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
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
