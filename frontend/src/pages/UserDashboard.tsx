import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Activity, Plus, History, AlertCircle, LayoutGrid, LayoutList, ChevronLeft, Calendar } from 'lucide-react';
import { fetchUserProfile, fetchUserEntries } from '../api/user';
import EntryCard from '../components/EntryCard';
import PeakFlowTable from '../components/PeakFlowTable';

export default function UserDashboard() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [cardPage, setCardPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<{ from?: string; to?: string }>({});
  const [showDateFilter, setShowDateFilter] = useState(false);
  const CARDS_PER_PAGE = 10;

  const profileQuery = useQuery({
    queryKey: ['userProfile', token],
    queryFn: () => fetchUserProfile(token!),
    enabled: !!token,
  });

  const entriesQuery = useQuery({
    queryKey: ['userEntries', token, 1, dateFilter],
    queryFn: () => fetchUserEntries(token!, 1, true, dateFilter.from, dateFilter.to),
    enabled: !!token,
  });

  if (profileQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 text-center">
        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 max-w-sm mx-auto">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-lg font-bold text-red-700 mb-2">{t('common.error')}</p>
          <p className="text-red-600 text-sm">{t('common.invalidToken')}</p>
        </div>
      </div>
    );
  }

  const user = profileQuery.data!;
  const entries = entriesQuery.data?.entries ?? [];

  return (
    <div className={`min-h-screen bg-gray-50 p-4 ${viewMode === 'table' ? 'max-w-full mx-auto overflow-x-hidden' : 'max-w-lg mx-auto'} space-y-4 pb-24`}>
      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-3 rounded-full">
            <Activity className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-sm text-gray-500 font-medium">({user.nickname})</p>
          </div>
        </div>
        {!user.personalBest && (
          <div className="mt-4 flex items-center gap-2 text-sm text-orange-700 bg-orange-50 p-3 rounded-xl border border-orange-100">
            <AlertCircle size={18} />
            <p>{t('zone.noPersonalBest')}</p>
          </div>
        )}
      </div>

      {entriesQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-dashed shadow-sm">
          <p className="text-gray-500 italic">{t('entry.noEntries')}</p>
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <History size={20} className="text-gray-400" />
            {t('user.entryHistory')}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className={`p-1.5 rounded-md transition-colors ${showDateFilter ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="Filter by date"
            >
              <Calendar size={18} />
            </button>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('card')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'card' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="Card view"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="Table view"
              >
                <LayoutList size={18} />
              </button>
            </div>
          </div>
        </div>

        {showDateFilter && (
          <div className="bg-white rounded-xl p-4 shadow-sm border space-y-3">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">{t('chart.filterByDate') || 'กรองตามวันที่'}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('entry.from') || 'จากวันที่'}</label>
                <input
                  type="date"
                  value={dateFilter.from || ''}
                  onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value || undefined })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('entry.to') || 'ถึงวันที่'}</label>
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

        {viewMode === 'card' ? (
          <>
            <div className="space-y-3">
              {entries.slice((cardPage - 1) * CARDS_PER_PAGE, cardPage * CARDS_PER_PAGE).map((e) => (
                <EntryCard key={e.entry._id} data={e} />
              ))}
            </div>
            {entries.length > CARDS_PER_PAGE && (
              <div className="flex justify-center items-center gap-4 mt-6">
                <button
                  onClick={() => setCardPage((p) => Math.max(1, p - 1))}
                  disabled={cardPage === 1}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm font-medium text-gray-600">
                  {cardPage} / {Math.ceil(entries.length / CARDS_PER_PAGE)}
                </span>
                <button
                  onClick={() => setCardPage((p) => Math.min(Math.ceil(entries.length / CARDS_PER_PAGE), p + 1))}
                  disabled={cardPage === Math.ceil(entries.length / CARDS_PER_PAGE)}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft size={20} className="rotate-180" />
                </button>
              </div>
            )}
          </>
        ) : (
          <PeakFlowTable entries={entries.map((e) => e.entry)} />
        )}
      </div>

      <Link
        to={`/u/${token}/new`}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-8 py-4 rounded-full shadow-xl font-bold hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 z-20"
      >
        <Plus size={24} />
        {t('user.addEntry')}
      </Link>
    </div>
  );
}
