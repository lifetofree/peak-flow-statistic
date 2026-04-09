import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Activity, Plus, History, AlertCircle, LayoutGrid, LayoutList, Sun, Moon } from 'lucide-react';
import { fetchUserProfile, fetchUserEntries } from '../api/user';
import EntryCard from '../components/EntryCard';
import { formatThaiDate } from '../utils/date';

export default function UserDashboard() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  const profileQuery = useQuery({
    queryKey: ['userProfile', token],
    queryFn: () => fetchUserProfile(token!),
    enabled: !!token,
  });

  const entriesQuery = useQuery({
    queryKey: ['userEntries', token, 1],
    queryFn: () => fetchUserEntries(token!, 1),
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
            <Link
              to={`/u/${token}/entries`}
              className="text-blue-600 text-sm font-semibold hover:underline flex items-center gap-1"
            >
              {t('chart.all')}
            </Link>
          </div>
        </div>

        {viewMode === 'card' ? (
          <div className="space-y-3">
            {entries.slice(0, 5).map((e) => (
              <EntryCard key={e.entry._id} data={e} />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-xl bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-3 py-3 font-semibold text-gray-600">Date</th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-600" colSpan={4}>
                    <div className="flex items-center justify-center gap-1">
                      <Sun className="text-orange-500" size={14} />
                      Morning
                    </div>
                  </th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-600" colSpan={4}>
                    <div className="flex items-center justify-center gap-1">
                      <Moon className="text-indigo-600" size={14} />
                      Evening
                    </div>
                  </th>
                </tr>
                <tr className="bg-gray-50/50 text-xs text-gray-500">
                  <th></th>
                  <th className="text-left px-2 py-1">Peak Flow</th>
                  <th className="text-left px-2 py-1">SpO₂</th>
                  <th className="text-left px-2 py-1">Med</th>
                  <th className="text-left px-2 py-1">Note</th>
                  <th className="text-left px-2 py-1">Peak Flow</th>
                  <th className="text-left px-2 py-1">SpO₂</th>
                  <th className="text-left px-2 py-1">Med</th>
                  <th className="text-left px-2 py-1">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(() => {
                  type GroupedEntry = { morning: any; evening: any };
                  const grouped: Record<string, GroupedEntry> = {};
                  for (const e of entries) {
                    const dateKey = e.entry.date.split('T')[0] as string;
                    let group: GroupedEntry | undefined = grouped[dateKey];
                    if (!group) {
                      group = { morning: null, evening: null };
                      grouped[dateKey] = group;
                    }
                    if (e.entry.period === 'morning') group.morning = e;
                    else group.evening = e;
                  }

                  const dateKeys = Object.keys(grouped).slice(0, 10);
                  return dateKeys.map((dateKey: string) => {
                    const dayGroup = grouped[dateKey]!;
                    const { morning, evening } = dayGroup;
                    const dateToShow = morning ? morning.entry.date : (evening ? evening.entry.date : dateKey);
                    return (
                    <tr key={dateKey} className="hover:bg-gray-50">
                      <td className="px-3 py-3 whitespace-nowrap font-medium text-gray-700">
                        {formatThaiDate(dateToShow)}
                      </td>
                      {morning !== null && morning !== undefined ? (
                        <>
                          <td className="px-2 py-3 text-xs">
                            {morning.entry.peakFlowReadings.join(' / ')} <span className="text-gray-400">L/min</span>
                          </td>
                          <td className="px-2 py-3">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                              morning.entry.spO2 >= 95 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {morning.entry.spO2}%
                            </span>
                          </td>
                          <td className="px-2 py-3 text-xs text-gray-500">{t(`entry.${morning.entry.medicationTiming}`)}</td>
                          <td className="px-2 py-3">
                            {morning.entry.note ? (
                              <span className="text-xs text-gray-600 truncate max-w-[80px] block">{morning.entry.note}</span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        </>
                      ) : (
                        <td colSpan={4} className="px-2 py-3 text-center text-gray-300 text-xs italic">-</td>
                      )}
                      {evening !== null && evening !== undefined ? (
                        <>
                          <td className="px-2 py-3 text-xs">
                            {evening.entry.peakFlowReadings.join(' / ')} <span className="text-gray-400">L/min</span>
                          </td>
                          <td className="px-2 py-3">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                              evening.entry.spO2 >= 95 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {evening.entry.spO2}%
                            </span>
                          </td>
                          <td className="px-2 py-3 text-xs text-gray-500">{t(`entry.${evening.entry.medicationTiming}`)}</td>
                          <td className="px-2 py-3">
                            {evening.entry.note ? (
                              <span className="text-xs text-gray-600 truncate max-w-[80px] block">{evening.entry.note}</span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        </>
                      ) : (
                        <td colSpan={4} className="px-2 py-3 text-center text-gray-300 text-xs italic">-</td>
                      )}
                    </tr>
                    );
                  });
                  return null;
                })()}
              </tbody>
            </table>
          </div>
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
