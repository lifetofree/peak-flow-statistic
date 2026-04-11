import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Activity, Plus, History, AlertCircle, List, LayoutGrid, ChevronLeft, FileText, X } from 'lucide-react';
import { fetchUserProfile, fetchUserEntries } from '../api/user';
import EntryCard from '../components/EntryCard';
import { formatThaiDate } from '../utils/date';

export default function UserDashboard() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
  const [entryPage, setEntryPage] = useState(1);
  const [viewingNote, setViewingNote] = useState<{ note: string; date: string } | null>(null);
  const cardsPerPage = 10;

  const profileQuery = useQuery({
    queryKey: ['userProfile', token],
    queryFn: () => fetchUserProfile(token!),
    enabled: Boolean(token),
  });

  const entriesQuery = useQuery({
    queryKey: ['userEntries', token],
    queryFn: () => fetchUserEntries(token!),
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
  const allEntries = entriesQuery.data?.entries ?? [];

  // Group entries by date and get latest entry for each period+medication combination
  const latestEntriesByDate: Record<string, any> = {};
  
  allEntries.forEach((entry: any) => {
    const dateKey = entry.entry.date.split('T')[0];
    const periodKey = entry.entry.period;
    const medKey = entry.entry.medicationTiming;
    const subKey = `${periodKey}-${medKey}`;
    
    if (!latestEntriesByDate[dateKey]) {
      latestEntriesByDate[dateKey] = {};
    }
    
    if (!latestEntriesByDate[dateKey][subKey] || 
        new Date(entry.entry.createdAt) > new Date(latestEntriesByDate[dateKey][subKey]?.entry.createdAt || 0)) {
      latestEntriesByDate[dateKey][subKey] = entry;
    }
  });
  
  // Convert to array format for table rendering
  const entriesByDate: Record<string, any[]> = {};
  Object.keys(latestEntriesByDate).forEach((date) => {
    entriesByDate[date] = [
      latestEntriesByDate[date]['morning-before'],
      latestEntriesByDate[date]['morning-after'],
      latestEntriesByDate[date]['evening-before'],
      latestEntriesByDate[date]['evening-after'],
    ].filter(Boolean);
  });

  const sortedDates = Object.keys(entriesByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // For list mode, show all dates
  const paginatedDates = sortedDates;

  // Pagination for card view
  const totalCards = allEntries.length;
  const totalCardPages = Math.ceil(totalCards / cardsPerPage);
  const cardStartIdx = (entryPage - 1) * cardsPerPage;
  const cardEndIdx = cardStartIdx + cardsPerPage;
  const paginatedCards = allEntries.slice(cardStartIdx, cardEndIdx);

  const renderPFCell = (entry: any) => {
    if (!entry) return <span className="text-gray-300">-</span>;
    const readings = entry.entry?.peakFlowReadings;
    if (!readings || !Array.isArray(readings)) return <span className="text-xs">-</span>;
    return <span className="text-xs">{readings.join('/')}</span>;
  };

  const renderSpO2Cell = (entry: any) => {
    if (!entry) return <span className="text-gray-300">-</span>;
    return (
      <span className={`px-1 py-0.5 rounded text-xs font-bold ${
        entry.entry.spO2 >= 95 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}>
        {entry.entry.spO2}
      </span>
    );
  };

  const renderNoteCell = (entry: any, date: string) => {
    if (!entry || !entry.entry.note) return <span className="text-gray-300">-</span>;
    return (
      <button
        onClick={() => setViewingNote({ note: entry.entry.note, date: formatThaiDate(date) })}
        className="text-blue-500 hover:text-blue-700 transition-colors"
      >
        <FileText size={12} />
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-4xl mx-auto space-y-4 pb-24">
      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-3 rounded-full">
            <Activity className="text-blue-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 leading-tight">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-sm text-gray-500 font-medium">({user.nickname})</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'card' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              title="Card View"
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              title="List View"
            >
              <List size={20} />
            </button>
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
      ) : allEntries.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-dashed shadow-sm">
          <p className="text-gray-500 italic">{t('entry.noEntries')}</p>
        </div>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <History size={20} className="text-gray-400" />
          {t('user.entryHistory')}
        </h2>

        {viewMode === 'card' ? (
          <>
            <div className="space-y-3">
              {paginatedCards.map((e) => (
                <EntryCard key={e.entry._id} data={e} />
              ))}
            </div>
            {totalCardPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-4">
                <button
                  onClick={() => setEntryPage((p) => Math.max(1, p - 1))}
                  disabled={entryPage === 1}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm font-medium text-gray-600">
                  {entryPage} / {totalCardPages}
                </span>
                <button
                  onClick={() => setEntryPage((p) => Math.min(totalCardPages, p + 1))}
                  disabled={entryPage === totalCardPages}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
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
                    <th className="px-2 py-2 font-semibold text-gray-600 border-r border-gray-300" rowSpan={2}>Date</th>
                    <th className="px-2 py-2 text-center text-orange-600 font-bold border-r border-orange-200" colSpan={3}>
                      Morning - Before Med
                    </th>
                    <th className="px-2 py-2 text-center text-orange-600 font-bold border-r border-orange-200" colSpan={3}>
                      Morning - After Med
                    </th>
                    <th className="px-2 py-2 text-center text-indigo-600 font-bold border-r border-indigo-200" colSpan={3}>
                      Evening - Before Med
                    </th>
                    <th className="px-2 py-2 text-center text-indigo-600 font-bold" colSpan={3}>
                      Evening - After Med
                    </th>
                  </tr>
                  <tr>
                    <th className="px-2 py-1 text-center font-semibold text-gray-500 border-r border-orange-100 bg-orange-50/10">PF(L/Min)</th>
                    <th className="px-2 py-1 text-center font-semibold text-gray-500 border-r border-orange-100 bg-orange-50/10">SpO2</th>
                    <th className="px-2 py-1 text-center font-semibold text-gray-500 border-r border-orange-100 bg-orange-50/10">Note</th>
                    <th className="px-2 py-1 text-center font-semibold text-gray-500 border-r border-orange-100 bg-orange-50/10">PF(L/Min)</th>
                    <th className="px-2 py-1 text-center font-semibold text-gray-500 border-r border-orange-100 bg-orange-50/10">SpO2</th>
                    <th className="px-2 py-1 text-center font-semibold text-gray-500 border-r border-orange-100 bg-orange-50/10">Note</th>
                    <th className="px-2 py-1 text-center font-semibold text-gray-500 border-r border-indigo-100 bg-indigo-50/10">PF(L/Min)</th>
                    <th className="px-2 py-1 text-center font-semibold text-gray-500 border-r border-indigo-100 bg-indigo-50/10">SpO2</th>
                    <th className="px-2 py-1 text-center font-semibold text-gray-500 border-r border-indigo-100 bg-indigo-50/10">Note</th>
                    <th className="px-2 py-1 text-center font-semibold text-gray-500 border-r border-indigo-100 bg-indigo-50/10">PF(L/Min)</th>
                    <th className="px-2 py-1 text-center font-semibold text-gray-500 border-r border-indigo-100 bg-indigo-50/10">SpO2</th>
                    <th className="px-2 py-1 text-center font-semibold text-gray-500 bg-indigo-50/10">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedDates.map((dateKey) => {
                    const dateEntries = entriesByDate[dateKey] || [];
                    const morningBeforeEntry = dateEntries.find((e: any) => e.entry.period === 'morning' && e.entry.medicationTiming === 'before');
                    const morningAfterEntry = dateEntries.find((e: any) => e.entry.period === 'morning' && e.entry.medicationTiming === 'after');
                    const eveningBeforeEntry = dateEntries.find((e: any) => e.entry.period === 'evening' && e.entry.medicationTiming === 'before');
                    const eveningAfterEntry = dateEntries.find((e: any) => e.entry.period === 'evening' && e.entry.medicationTiming === 'after');

                    const displayDate = morningBeforeEntry?.entry?.date || morningAfterEntry?.entry?.date || eveningBeforeEntry?.entry?.date || eveningAfterEntry?.entry?.date || dateKey;

                    return (
                      <tr key={dateKey} className="hover:bg-gray-50 transition-colors">
                        <td className="px-2 py-2 whitespace-nowrap font-medium text-gray-700 border-r border-gray-200">
                          {formatThaiDate(displayDate)}
                        </td>
                        <td className="px-2 py-2 text-center border-r border-orange-100 bg-orange-50/5">{renderPFCell(morningBeforeEntry)}</td>
                        <td className="px-2 py-2 text-center border-r border-orange-100 bg-orange-50/5">{renderSpO2Cell(morningBeforeEntry)}</td>
                        <td className="px-2 py-2 text-center border-r border-orange-200 bg-orange-50/10">{renderNoteCell(morningBeforeEntry, displayDate)}</td>
                        <td className="px-2 py-2 text-center border-r border-orange-100 bg-orange-50/5">{renderPFCell(morningAfterEntry)}</td>
                        <td className="px-2 py-2 text-center border-r border-orange-100 bg-orange-50/5">{renderSpO2Cell(morningAfterEntry)}</td>
                        <td className="px-2 py-2 text-center border-r border-purple-200 bg-purple-50/10">{renderNoteCell(morningAfterEntry, displayDate)}</td>
                        <td className="px-2 py-2 text-center border-r border-indigo-100 bg-indigo-50/5">{renderPFCell(eveningBeforeEntry)}</td>
                        <td className="px-2 py-2 text-center border-r border-indigo-100 bg-indigo-50/5">{renderSpO2Cell(eveningBeforeEntry)}</td>
                        <td className="px-2 py-2 text-center border-r border-indigo-200 bg-indigo-50/10">{renderNoteCell(eveningBeforeEntry, displayDate)}</td>
                        <td className="px-2 py-2 text-center border-r border-indigo-100 bg-indigo-50/5">{renderPFCell(eveningAfterEntry)}</td>
                        <td className="px-2 py-2 text-center border-r border-indigo-100 bg-indigo-50/5">{renderSpO2Cell(eveningAfterEntry)}</td>
                        <td className="px-2 py-2 text-center bg-blue-50/10">{renderNoteCell(eveningAfterEntry, displayDate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

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
              <p>{viewingNote.note}</p>
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
