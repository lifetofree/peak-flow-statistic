import { useTranslation } from 'react-i18next';
import { History, ChevronLeft } from 'lucide-react';
import EntryCard from '../EntryCard';
import { EntryWithZone } from '../../types';

interface EntriesCardViewProps {
  entries: EntryWithZone[];
  dayPage: number;
  daysPerPage: number;
  totalDays: number;
  onPageChange: (page: number) => void;
}

export default function EntriesCardView({ 
  entries, 
  dayPage, 
  daysPerPage, 
  totalDays,
  onPageChange 
}: EntriesCardViewProps) {
  const { t } = useTranslation();

  const totalPages = Math.ceil(totalDays / daysPerPage);

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
            onClick={() => onPageChange(Math.max(1, dayPage - 1))}
            disabled={dayPage === 1}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-medium text-gray-600">
            {dayPage} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, dayPage + 1))}
            disabled={dayPage === totalPages}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
          >
            <ChevronLeft size={20} className="rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
}
