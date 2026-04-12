import { useTranslation } from 'react-i18next';
import { History, ChevronLeft } from 'lucide-react';
import EntryCard from '../EntryCard';

interface Entry {
  entry: {
    _id: string;
    date: string;
    period: 'morning' | 'evening';
    medicationTiming: 'before' | 'after';
    peakFlowReadings: number[];
    spO2: number;
    note: string;
    createdAt: string;
  };
  zone: any;
}

interface EntriesCardViewProps {
  entries: Entry[];
  entryPage: number;
  cardsPerPage: number;
  totalEntries: number;
  onPageChange: (page: number) => void;
}

export default function EntriesCardView({ 
  entries, 
  entryPage, 
  cardsPerPage, 
  totalEntries,
  onPageChange 
}: EntriesCardViewProps) {
  const { t } = useTranslation();

  const totalPages = Math.ceil(totalEntries / cardsPerPage);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
        <History size={20} className="text-gray-400" />
        {t('user.entryHistory')}
      </h2>

      <div className="space-y-3">
        {entries.map((e) => (
          <EntryCard key={e.entry._id} data={e} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-4">
          <button
            onClick={() => onPageChange(Math.max(1, entryPage - 1))}
            disabled={entryPage === 1}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-medium text-gray-600">
            {entryPage} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, entryPage + 1))}
            disabled={entryPage === totalPages}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
          >
            <ChevronLeft size={20} className="rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
}
