import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Activity, Plus, AlertCircle } from 'lucide-react';
import { fetchUserProfile, fetchUserEntries } from '../api/user';
import { groupEntriesByDate, convertGroupedToArray } from '../utils/entryGrouping';
import ViewModeToggle from '../components/user/ViewModeToggle';
import EntriesCardView from '../components/user/EntriesCardView';
import EntriesListView from '../components/user/EntriesListView';
import UserNoteModal from '../components/user/UserNoteModal';
import DateFilter from '../components/DateFilter';

export default function UserDashboard() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
  const [entryPage, setEntryPage] = useState(1);
  const [viewingNote, setViewingNote] = useState<{ note: string; date: string } | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const cardsPerPage = 10;
  const listEntriesPerPage = 80;

  const profileQuery = useQuery({
    queryKey: ['userProfile', token],
    queryFn: () => fetchUserProfile(token!),
    enabled: Boolean(token),
  });

  const entriesQuery = useQuery({
    queryKey: ['userEntries', token, entryPage, viewMode, fromDate, toDate],
    queryFn: () => fetchUserEntries(
      token!, 
      viewMode === 'list' ? listEntriesPerPage : cardsPerPage, 
      fromDate || undefined, 
      toDate || undefined, 
      entryPage
    ),
    enabled: !!token,
  });

  const handleViewModeChange = (mode: 'card' | 'list') => {
    setViewMode(mode);
    setEntryPage(1);
  };

  const handlePageChange = (page: number) => {
    setEntryPage(page);
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
  const entriesWithZone = entriesQuery.data?.entries ?? [];
  const allEntries = entriesWithZone.map(item => item.entry);
  const groupedEntries = groupEntriesByDate(allEntries);
  const entriesByDate = convertGroupedToArray(groupedEntries);

  const totalEntries = entriesQuery.data?.total ?? 0;
  const entriesPerPage = viewMode === 'list' ? listEntriesPerPage : cardsPerPage;

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
          <ViewModeToggle 
            viewMode={viewMode} 
            onViewModeChange={handleViewModeChange}
          />
        </div>
        {!user.personalBest && (
          <div className="mt-4 flex items-center gap-2 text-sm text-orange-700 bg-orange-50 p-3 rounded-xl border border-orange-100">
            <AlertCircle size={18} />
            <p>{t('zone.noPersonalBest')}</p>
          </div>
        )}
      </div>

      <DateFilter
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={handleFromDateChange}
        onToDateChange={handleToDateChange}
        onClear={handleClearFilter}
      />

      {entriesQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : allEntries.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-dashed shadow-sm">
          <p className="text-gray-500 italic">{t('entry.noEntries')}</p>
        </div>
      ) : viewMode === 'card' ? (
        <EntriesCardView
          entries={allEntries}
          entryPage={entryPage}
          cardsPerPage={cardsPerPage}
          totalEntries={totalEntries}
          onPageChange={handlePageChange}
        />
      ) : (
        <EntriesListView
          entriesByDate={entriesByDate}
          entryPage={entryPage}
          entriesPerPage={entriesPerPage}
          totalEntries={totalEntries}
          onPageChange={handlePageChange}
          onViewNote={(note, date) => setViewingNote({ note, date })}
        />
      )}

      {viewingNote && (
        <UserNoteModal
          note={viewingNote.note}
          date={viewingNote.date}
          onClose={() => setViewingNote(null)}
        />
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
