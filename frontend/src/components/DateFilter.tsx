import { Calendar, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import BuddhistDatePicker from './BuddhistDatePicker';

interface DateFilterProps {
  fromDate: string;
  toDate: string;
  onFromDateChange: (date: string) => void;
  onToDateChange: (date: string) => void;
  onClear: () => void;
}

export default function DateFilter({ 
  fromDate, 
  toDate, 
  onFromDateChange, 
  onToDateChange,
  onClear 
}: DateFilterProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border space-y-3">
      <div className="flex items-center gap-2">
        <Calendar size={18} className="text-blue-600" />
        <span className="font-semibold text-gray-700">{t('common.dateFilter')}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BuddhistDatePicker
          value={fromDate}
          onChange={onFromDateChange}
          placeholder={t('common.fromDatePlaceholder')}
        />
        <BuddhistDatePicker
          value={toDate}
          onChange={onToDateChange}
          placeholder={t('common.toDatePlaceholder')}
        />
      </div>
      {(fromDate || toDate) && (
        <button
          onClick={onClear}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <X size={14} />
          {t('common.clearFilter')}
        </button>
      )}
    </div>
  );
}
