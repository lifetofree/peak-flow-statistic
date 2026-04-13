import { useTranslation } from 'react-i18next';
import { History, ChevronLeft, Sun, Moon, FileText } from 'lucide-react';
import { formatThaiDate } from '../../utils/date';

interface Entry {
  _id: string;
  date: string;
  period: 'morning' | 'evening';
  medicationTiming: 'before' | 'after';
  peakFlowReadings: number[];
  spO2: number;
  note: string;
}

interface UserEntriesTableProps {
  entriesByDate: Record<string, Entry[]>;
  totalDays: number;
  dayPage: number;
  daysPerPage: number;
  onPageChange: (page: number) => void;
  onViewNote: (note: string, date: string) => void;
}

export default function UserEntriesTable({ 
  entriesByDate, 
  totalDays, 
  dayPage, 
  daysPerPage, 
  onPageChange,
  onViewNote 
}: UserEntriesTableProps) {
  const { t } = useTranslation();

  const sortedDates = Object.keys(entriesByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const renderPFCell = (entry: Entry | null) => {
    if (!entry) return <span className="text-gray-300">-</span>;
    return <span className="text-xs">{entry.peakFlowReadings?.join('/') || '-'}</span>;
  };

  const renderSpO2Cell = (entry: Entry | null) => {
    if (!entry) return <span className="text-gray-300">-</span>;
    return (
      <span className={`px-1 py-0.5 rounded text-xs font-bold ${
        entry.spO2 >= 95 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}>
        {entry.spO2}
      </span>
    );
  };

  const renderNoteCell = (entry: Entry | null, date: string) => {
    if (!entry || !entry.note) return <span className="text-gray-300">-</span>;
    return (
      <button
        onClick={() => onViewNote(entry.note, date)}
        className="text-blue-500 hover:text-blue-700 transition-colors"
      >
        <FileText size={12} />
      </button>
    );
  };

  const totalPages = Math.ceil(totalDays / daysPerPage);

  if (totalDays === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <History size={20} className="text-purple-600" />
          {t('admin.entries')}
        </h3>
        <div className="text-center py-8 text-gray-500 italic border rounded-xl border-dashed">
          {t('entry.noEntries')}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <History size={20} className="text-purple-600" />
        {t('admin.entries')}
      </h3>

      <div className="overflow-x-auto border rounded-xl">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-2 py-2 font-semibold text-gray-600 border-r border-gray-300" rowSpan={2}>Date</th>
              <th className="px-2 py-2 text-center text-orange-600 font-bold border-r border-orange-200" colSpan={3}>
                <div className="flex items-center justify-center gap-1">
                  <Sun className="text-orange-500" size={12} />
                  <span>Morning - Before Med</span>
                </div>
              </th>
              <th className="px-2 py-2 text-center text-orange-600 font-bold border-r border-orange-200" colSpan={3}>
                <div className="flex items-center justify-center gap-1">
                  <Sun className="text-orange-500" size={12} />
                  <span>Morning - After Med</span>
                </div>
              </th>
              <th className="px-2 py-2 text-center text-indigo-600 font-bold border-r border-indigo-200" colSpan={3}>
                <div className="flex items-center justify-center gap-1">
                  <Moon className="text-indigo-600" size={12} />
                  <span>Evening - Before Med</span>
                </div>
              </th>
              <th className="px-2 py-2 text-center text-indigo-600 font-bold" colSpan={3}>
                <div className="flex items-center justify-center gap-1">
                  <Moon className="text-indigo-600" size={12} />
                  <span>Evening - After Med</span>
                </div>
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
            {sortedDates.map((dateKey) => {
              const dateEntries = entriesByDate[dateKey] || [];
              const morningBeforeEntry = dateEntries.find((e: Entry) => e.period === 'morning' && e.medicationTiming === 'before');
              const morningAfterEntry = dateEntries.find((e: Entry) => e.period === 'morning' && e.medicationTiming === 'after');
              const eveningBeforeEntry = dateEntries.find((e: Entry) => e.period === 'evening' && e.medicationTiming === 'before');
              const eveningAfterEntry = dateEntries.find((e: Entry) => e.period === 'evening' && e.medicationTiming === 'after');

              const displayDate = morningBeforeEntry?.date || morningAfterEntry?.date || eveningBeforeEntry?.date || eveningAfterEntry?.date || dateKey;

              return (
                <tr key={dateKey} className="hover:bg-gray-50 transition-colors">
                  <td className="px-2 py-2 whitespace-nowrap font-medium text-gray-700 border-r border-gray-200">
                    {formatThaiDate(displayDate)}
                  </td>
                  <td className="px-2 py-2 text-center border-r border-orange-100 bg-orange-50/5">{renderPFCell(morningBeforeEntry || null)}</td>
                  <td className="px-2 py-2 text-center border-r border-orange-100 bg-orange-50/5">{renderSpO2Cell(morningBeforeEntry || null)}</td>
                  <td className="px-2 py-2 text-center border-r border-orange-200 bg-orange-50/10">{renderNoteCell(morningBeforeEntry || null, displayDate)}</td>
                  <td className="px-2 py-2 text-center border-r border-orange-100 bg-orange-50/5">{renderPFCell(morningAfterEntry || null)}</td>
                  <td className="px-2 py-2 text-center border-r border-orange-100 bg-orange-50/5">{renderSpO2Cell(morningAfterEntry || null)}</td>
                  <td className="px-2 py-2 text-center border-r border-purple-200 bg-purple-50/10">{renderNoteCell(morningAfterEntry || null, displayDate)}</td>
                  <td className="px-2 py-2 text-center border-r border-indigo-100 bg-indigo-50/5">{renderPFCell(eveningBeforeEntry || null)}</td>
                  <td className="px-2 py-2 text-center border-r border-indigo-100 bg-indigo-50/5">{renderSpO2Cell(eveningBeforeEntry || null)}</td>
                  <td className="px-2 py-2 text-center border-r border-indigo-200 bg-indigo-50/10">{renderNoteCell(eveningBeforeEntry || null, displayDate)}</td>
                  <td className="px-2 py-2 text-center border-r border-indigo-100 bg-indigo-50/5">{renderPFCell(eveningAfterEntry || null)}</td>
                  <td className="px-2 py-2 text-center border-r border-indigo-100 bg-indigo-50/5">{renderSpO2Cell(eveningAfterEntry || null)}</td>
                  <td className="px-2 py-2 text-center bg-blue-50/10">{renderNoteCell(eveningAfterEntry || null, displayDate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
