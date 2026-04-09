import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { Search, Plus, User as UserIcon, Activity, ClipboardList, Copy, Check, Eye, Edit2 } from 'lucide-react';
import { fetchUsers, createUser } from '../api/admin';
import { formatThaiDateTime } from '../utils/date';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showAdminNotePreview, setShowAdminNotePreview] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', nickname: '', personalBest: '', adminNote: '' });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCopyLink = (shortCode: string, userId: string) => {
    const url = `${window.location.origin}/s/${shortCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(userId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const usersQuery = useQuery({
    queryKey: ['adminUsers', page, search],
    queryFn: () => fetchUsers(page, search || undefined),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createUser({
        firstName: form.firstName,
        lastName: form.lastName,
        nickname: form.nickname,
        personalBest: form.personalBest ? Number(form.personalBest) : null,
        adminNote: form.adminNote,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setShowCreate(false);
      setShowAdminNotePreview(false);
      setForm({ firstName: '', lastName: '', nickname: '', personalBest: '', adminNote: '' });
    },
  });

  const totalPages = usersQuery.data ? Math.ceil(usersQuery.data.total / usersQuery.data.pageSize) : 0;

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="text-blue-600" />
          {t('admin.title')}
        </h1>
        <div className="flex gap-4">
          <Link to="/admin/audit" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            <ClipboardList size={16} />
            {t('admin.auditLog')}
          </Link>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder={t('admin.search')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full border rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1 transition-colors"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">{t('admin.createUser')}</span>
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-lg p-4 shadow-sm border mb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              placeholder={t('admin.firstName')}
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
            <input
              placeholder={t('admin.lastName')}
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
            <input
              placeholder={t('admin.nickname')}
              value={form.nickname}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
            <input
              type="number"
              placeholder={t('admin.personalBest')}
              value={form.personalBest}
              onChange={(e) => setForm({ ...form, personalBest: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">
                {t('admin.adminNote')}
              </label>
              <button
                type="button"
                onClick={() => setShowAdminNotePreview(!showAdminNotePreview)}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                {showAdminNotePreview ? (
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
            {showAdminNotePreview ? (
              <div className="border rounded-lg px-3 py-2 min-h-[72px] bg-gray-50 prose prose-sm max-w-none">
                {form.adminNote ? (
                  <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{form.adminNote}</ReactMarkdown>
                ) : (
                  <p className="text-gray-400 italic">{t('entry.noNote')}</p>
                )}
              </div>
            ) : (
              <textarea
                placeholder={t('entry.notePlaceholder')}
                value={form.adminNote}
                onChange={(e) => setForm({ ...form, adminNote: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                rows={3}
              />
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !form.firstName || !form.lastName || !form.nickname}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? t('common.loading') : t('common.save')}
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setShowAdminNotePreview(false);
                setForm({ firstName: '', lastName: '', nickname: '', personalBest: '', adminNote: '' });
              }}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {usersQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : usersQuery.isError ? (
        <div className="text-center py-8">
          <p className="text-red-500 mb-2">{t('common.error')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('admin.users')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">
                  {t('admin.personalBest')}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">
                  {t('entry.lastEntry') || 'Last Entry'}
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {usersQuery.data?.users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500 italic">
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                usersQuery.data?.users.map((user) => (
                  <tr 
                    key={user._id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/users/${user._id}`)}
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/users/${user._id}`}
                        className="font-medium text-blue-600 hover:underline flex items-center gap-2"
                      >
                        <UserIcon size={16} className="text-gray-400" />
                        {user.firstName} {user.lastName}
                      </Link>
                      <p className="text-xs text-gray-500 ml-6">({user.nickname})</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {user.personalBest ? (
                        <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-medium">
                          {user.personalBest} L/min
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {user.lastEntryDate ? (
                        <span className="text-xs text-gray-600">
                          {formatThaiDateTime(user.lastEntryDate)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleCopyLink(user.shortCode, user._id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          copiedId === user._id
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
                        }`}
                      >
                        {copiedId === user._id ? <Check size={12} /> : <Copy size={12} />}
                        {copiedId === user._id ? t('admin.linkCopied') : t('admin.copyLink')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg bg-gray-100 disabled:opacity-50"
          >
            &laquo;
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg bg-gray-100 disabled:opacity-50"
          >
            &raquo;
          </button>
        </div>
      )}
    </div>
  );
}
