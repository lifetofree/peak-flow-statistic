import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { Activity, Plus, History, AlertCircle, LayoutGrid, LayoutList, Sun, Moon, FileText, ChevronLeft, Calendar, X } from 'lucide-react';
import { fetchUserProfile, fetchUserEntries } from '../api/user';
import EntryCard from '../components/EntryCard';
import { formatThaiDate } from '../utils/date';

export default function UserDashboard() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewingNote, setViewingNote] = useState<{ note: string; date: string } | null>(null);

  const profileQuery = useQuery({
    queryKey: ['userProfile', token],
    queryFn: () => fetchUserProfile(token!),
    enabled: Boolean(token),
  });

  const pageSize = viewMode === 'card' ? 10 : 20;

  const entriesQuery = useQuery({
    queryKey: ['userEntries', token, page, pageSize, dateFrom, dateTo],
    queryFn: () => fetchUserEntries(token!, page, dateFrom || undefined, dateTo || undefined),
    enabled: Boolean(token),
  });

  const today = new Date().toISOString().split('T')[0];

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
  const total = entriesQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  // Group entries by date, period, and medication timing
  const groupedEntries = entries.reduce((acc, entryWrapper) => {
    const entry = entryWrapper.entry;
    const dateKey = entry.date.split('T')[0];
    const periodKey = entry.period;
    const medKey = entry.medicationTiming;
    const key = `${dateKey}-${periodKey}-${medKey}`;
    
    if (!acc[key] || new Date(entry.createdAt) > new Date(acc[key].entry.createdAt)) {
      acc[key] = entryWrapper;
    }
    return acc;
  }, {} as Record<string, { entry: any }>);

  // Group by date for display
  const entriesByDate = Object.values(groupedEntries).reduce((acc, entryWrapper) => {
    const entry = entryWrapper.entry;
    const dateKey = entry.date.split('T')[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(entry);
    return acc;
  }, {} as Record<string, any[]>);

  // Sort dates descending
  const sortedDates = Object.keys(entriesByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className={`min-h-screen bg-gray-50 p-4 ${viewMode === 'table' ? 'max-w-6xl mx-auto' : 'max-w-lg mx-auto'} space-y-4 pb-24`}>
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
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => { setViewMode('card'); setPage(1); }}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'card' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="Card view"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => { setViewMode('table'); setPage(1); }}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="Table view"
              >
                <LayoutList size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 bg-white p-3 rounded-xl border">
          <Calendar size={16} className="text-gray-400" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            max={dateTo || today}
            className="text-sm border rounded-lg px-2 py-1"
          />
          <span className="text-gray-400 text-sm">-</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            max={today}
            min={dateFrom}
            className="text-sm border rounded-lg px-2 py-1"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
              className="text-xs text-gray-500 hover:text-gray-700 ml-2"
            >
              {t('common.clear')}
            </button>
          )}
        </div>

        {entriesQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-dashed shadow-sm">
            <p className="text-gray-500 italic">{t('entry.noEntries')}</p>
          </div>
        ) : viewMode === 'card' ? (
          <>
            <div className="space-y-3">
              {entries.slice(0, pageSize).map((e) => (
                <EntryCard key={e.entry._id} data={e} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 py-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg bg-white border hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm font-medium text-gray-600">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg bg-white border hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft size={20} className="rotate-180" />
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="overflow-x-auto border rounded-xl bg-white">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-2 py-2 font-semibold text-gray-600 w-20 border-r" rowSpan={2}>Date</th>
                    <th className="px-1 py-1 text-center text-orange-700 font-bold border-r border-orange-200" colSpan={3}>
                      <div className="flex items-center justify-center gap-1">
                        <Sun className="text-orange-500" size={10} />
                        Morning - Before Med
                      </div>
                    </th>
                    <th className="px-1 py-1 text-center text-purple-700 font-bold border-r border-purple-200" colSpan={3}>
                      <div className="flex items-center justify-center gap-1">
                        <Sun className="text-orange-500" size={10} />
                        Morning - After Med
                      </div>
                    </th>
                    <th className="px-1 py-1 text-center text-indigo-700 font-bold border-r border-indigo-200" colSpan={3}>
                      <div className="flex items-center justify-center gap-1">
                        <Moon className="text-indigo-600" size={10} />
                        Evening - Before Med
                      </div>
                    </th>
                    <th className="px-1 py-1 text-center text-blue-700 font-bold border-r border-blue-200" colSpan={3}>
                      <div className="flex items-center justify-center gap-1">
                        <Moon className="text-indigo-600" size={10} />
                        Evening - After Med
                      </div>
                    </th>
                  </tr>
                  <tr className="bg-gray-50/70 text-gray-500">
                    <th className="px-1 py-1 text-center font-medium border-r border-orange-200">PF</th>
                    <th className="px-1 py-1 text-center font-medium border-r border-orange-200">SpO₂</th>
                    <th className="px-1 py-1 text-center font-medium border-r border-gray-200">Note</th>
                    <th className="px-1 py-1 text-center font-medium border-r border-purple-200">PF</th>
                    <th className="px-1 py-1 text-center font-medium border-r border-purple-200">SpO₂</th>
                    <th className="px-1 py-1 text-center font-medium border-r border-gray-200">Note</th>
                    <th className="px-1 py-1 text-center font-medium border-r border-indigo-200">PF</th>
                    <th className="px-1 py-1 text-center font-medium border-r border-indigo-200">SpO₂</th>
                    <th className="px-1 py-1 text-center font-medium border-r border-gray-200">Note</th>
                    <th className="px-1 py-1 text-center font-medium border-r border-blue-200">PF</th>
                    <th className="px-1 py-1 text-center font-medium border-r border-blue-200">SpO₂</th>
                    <th className="px-1 py-1 text-center font-medium">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedDates.slice(0, pageSize).map((dateKey) => {
                    const dateEntries = entriesByDate[dateKey] || [];
                    const morningBeforeEntry = dateEntries.find((e) => e.period === 'morning' && e.medicationTiming === 'before');
                    const morningAfterEntry = dateEntries.find((e) => e.period === 'morning' && e.medicationTiming === 'after');
                    const eveningBeforeEntry = dateEntries.find((e) => e.period === 'evening' && e.medicationTiming === 'before');
                    const eveningAfterEntry = dateEntries.find((e) => e.period === 'evening' && e.medicationTiming === 'after');

                    const renderCell = (entry: any) => {
                      if (!entry) return <span className="text-gray-300">-</span>;
                      return entry.peakFlowReadings?.join('/') || '-';
                    };
                    
                    const renderSpO2 = (entry: any) => {
                      if (!entry) return <span className="text-gray-300">-</span>;
                      return (
                        <span className={`px-1 py-0.5 rounded text-xs font-bold ${
                          entry.spO2 >= 95 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {entry.spO2}
                        </span>
                      );
                    };
                    
                    const renderNote = (entry: any) => {
                      if (!entry?.note) return <span className="text-gray-300">-</span>;
                      return (
                        <button
                          onClick={() => setViewingNote({ note: entry.note, date: formatThaiDate(entry.date) })}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <FileText size={12} />
                        </button>
                      );
                    };

                    return (
                      <tr key={dateKey} className="hover:bg-gray-50 transition-colors">
                        <td className="px-2 py-2 whitespace-nowrap font-medium text-gray-700 border-r">
                          {formatThaiDate(dateEntries[0].date)}
                        </td>
                        <td className="px-1 py-2 text-center border-r border-orange-200 bg-orange-50/20">{renderCell(morningBeforeEntry)}</td>
                        <td className="px-1 py-2 text-center border-r border-orange-200 bg-orange-50/20">{renderSpO2(morningBeforeEntry)}</td>
                        <td className="px-1 py-2 text-center border-r border-gray-200 bg-orange-50/20">{renderNote(morningBeforeEntry)}</td>
                        <td className="px-1 py-2 text-center border-r border-purple-200 bg-purple-50/20">{renderCell(morningAfterEntry)}</td>
                        <td className="px-1 py-2 text-center border-r border-purple-200 bg-purple-50/20">{renderSpO2(morningAfterEntry)}</td>
                        <td className="px-1 py-2 text-center border-r border-gray-200 bg-purple-50/20">{renderNote(morningAfterEntry)}</td>
                        <td className="px-1 py-2 text-center border-r border-indigo-200 bg-indigo-50/20">{renderCell(eveningBeforeEntry)}</td>
                        <td className="px-1 py-2 text-center border-r border-indigo-200 bg-indigo-50/20">{renderSpO2(eveningBeforeEntry)}</td>
                        <td className="px-1 py-2 text-center border-r border-gray-200 bg-indigo-50/20">{renderNote(eveningBeforeEntry)}</td>
                        <td className="px-1 py-2 text-center border-r border-blue-200 bg-blue-50/20">{renderCell(eveningAfterEntry)}</td>
                        <td className="px-1 py-2 text-center border-r border-blue-200 bg-blue-50/20">{renderSpO2(eveningAfterEntry)}</td>
                        <td className="px-1 py-2 text-center bg-blue-50/20">{renderNote(eveningAfterEntry)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {viewingNote && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-auto">
                  <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-bold">{t('entry.note')} - {viewingNote.date}</h3>
                    <button onClick={() => setViewingNote(null)} className="text-gray-500 hover:text-gray-700">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-4 prose prose-sm max-w-none">
                    <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{viewingNote.note}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 py-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg bg-white border hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm font-medium text-gray-600">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg bg-white border hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft size={20} className="rotate-180" />
                </button>
              </div>
            )}
          </>
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
