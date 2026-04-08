import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { FileText, X, ChevronLeft } from 'lucide-react';
import type { Entry } from '../types';
import { formatThaiDate } from '../utils/date';

interface Props {
  entries: Entry[];
}

const DATES_PER_PAGE = 20;

export default function PeakFlowTable({ entries }: Props) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [viewingNote, setViewingNote] = useState<{ note: string; date: string } | null>(null);

  // Deduplicate: group by date-period-medicationTiming, keep latest by createdAt
  const deduplicated = entries.reduce<Record<string, Entry>>((acc, entry) => {
    const dateKey = entry.date.split('T')[0];
    const key = `${dateKey}-${entry.period}-${entry.medicationTiming}`;
    if (!acc[key] || new Date(entry.createdAt) > new Date(acc[key].createdAt)) {
      acc[key] = entry;
    }
    return acc;
  }, {});

  // Group by date
  const entriesByDate: Record<string, Entry[]> = Object.values(deduplicated).reduce((acc, entry) => {
    const dateKey = entry.date.split('T')[0] as string;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey]!.push(entry);
    return acc;
  }, {} as Record<string, Entry[]>);

  // Sort dates descending
  const sortedDates = Object.keys(entriesByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const totalPages = Math.ceil(sortedDates.length / DATES_PER_PAGE);
  const startIndex = (page - 1) * DATES_PER_PAGE;
  const paginatedDates = sortedDates.slice(startIndex, startIndex + DATES_PER_PAGE);

  const renderPF = (entry: Entry | undefined) => {
    if (!entry) return null;
    return <span>{entry.peakFlowReadings.join('/')}</span>;
  };

  const renderSpO2 = (entry: Entry | undefined) => {
    if (!entry || entry.spO2 == null) return null;
    return (
      <span
        className={`px-1 py-0.5 rounded text-xs font-bold ${
          entry.spO2 >= 95 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}
      >
        {entry.spO2}%
      </span>
    );
  };

  const renderNote = (entry: Entry | undefined) => {
    if (!entry?.note) return null;
    return (
      <button
        onClick={() => setViewingNote({ note: entry.note, date: formatThaiDate(entry.date) })}
        className="text-gray-400 hover:text-blue-600 transition-colors"
        title="View note"
      >
        <FileText size={12} />
      </button>
    );
  };

  return (
    <>
      <div className="overflow-x-auto border rounded-xl bg-white">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th
                className="px-2 py-2 font-semibold text-gray-600 w-20 border-r border-gray-300"
                rowSpan={2}
              >
                {t('entry.date')}
              </th>
              <th
                className="px-1 py-1 text-center text-orange-700 font-bold border-r border-orange-200"
                colSpan={3}
              >
                {t('table.morningBeforeMed')}
              </th>
              <th
                className="px-1 py-1 text-center text-purple-700 font-bold border-r border-purple-200"
                colSpan={3}
              >
                {t('table.morningAfterMed')}
              </th>
              <th
                className="px-1 py-1 text-center text-indigo-700 font-bold border-r border-indigo-200"
                colSpan={3}
              >
                {t('table.eveningBeforeMed')}
              </th>
              <th
                className="px-1 py-1 text-center text-blue-700 font-bold border-r border-blue-200"
                colSpan={3}
              >
                {t('table.eveningAfterMed')}
              </th>
            </tr>
            <tr className="bg-gray-50/70 text-gray-500">
              {/* Morning Before */}
              <th className="px-1 py-1 text-center font-medium border-r border-orange-200">
                {t('table.pfUnit')}
              </th>
              <th className="px-1 py-1 text-center font-medium border-r border-orange-200">
                {t('entry.spO2')}
              </th>
              <th className="px-1 py-1 text-center font-medium border-r border-gray-300">
                {t('entry.note')}
              </th>
              {/* Morning After */}
              <th className="px-1 py-1 text-center font-medium border-r border-purple-200">
                {t('table.pfUnit')}
              </th>
              <th className="px-1 py-1 text-center font-medium border-r border-purple-200">
                {t('entry.spO2')}
              </th>
              <th className="px-1 py-1 text-center font-medium border-r border-gray-300">
                {t('entry.note')}
              </th>
              {/* Evening Before */}
              <th className="px-1 py-1 text-center font-medium border-r border-indigo-200">
                {t('table.pfUnit')}
              </th>
              <th className="px-1 py-1 text-center font-medium border-r border-indigo-200">
                {t('entry.spO2')}
              </th>
              <th className="px-1 py-1 text-center font-medium border-r border-gray-300">
                {t('entry.note')}
              </th>
              {/* Evening After */}
              <th className="px-1 py-1 text-center font-medium border-r border-blue-200">
                {t('table.pfUnit')}
              </th>
              <th className="px-1 py-1 text-center font-medium border-r border-blue-200">
                {t('entry.spO2')}
              </th>
              <th className="px-1 py-1 text-center font-medium">
                {t('entry.note')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedDates.map((dateKey) => {
              const dateEntries = entriesByDate[dateKey] || [];
              const morningBefore = dateEntries.find(
                (e) => e.period === 'morning' && e.medicationTiming === 'before'
              );
              const morningAfter = dateEntries.find(
                (e) => e.period === 'morning' && e.medicationTiming === 'after'
              );
              const eveningBefore = dateEntries.find(
                (e) => e.period === 'evening' && e.medicationTiming === 'before'
              );
              const eveningAfter = dateEntries.find(
                (e) => e.period === 'evening' && e.medicationTiming === 'after'
              );

              return (
                <tr key={dateKey} className="hover:bg-gray-50 transition-colors">
                  <td className="px-2 py-2 whitespace-nowrap font-medium text-gray-700 border-r border-gray-200">
                    {dateEntries[0] ? formatThaiDate(dateEntries[0].date) : ''}
                  </td>
                  {/* Morning Before Med */}
                  <td className="px-1 py-2 text-center border-r border-orange-200 bg-orange-50/20">
                    {renderPF(morningBefore)}
                  </td>
                  <td className="px-1 py-2 text-center border-r border-orange-200 bg-orange-50/20">
                    {renderSpO2(morningBefore)}
                  </td>
                  <td className="px-1 py-2 text-center border-r border-gray-200 bg-orange-50/20">
                    {renderNote(morningBefore)}
                  </td>
                  {/* Morning After Med */}
                  <td className="px-1 py-2 text-center border-r border-purple-200 bg-purple-50/20">
                    {renderPF(morningAfter)}
                  </td>
                  <td className="px-1 py-2 text-center border-r border-purple-200 bg-purple-50/20">
                    {renderSpO2(morningAfter)}
                  </td>
                  <td className="px-1 py-2 text-center border-r border-gray-200 bg-purple-50/20">
                    {renderNote(morningAfter)}
                  </td>
                  {/* Evening Before Med */}
                  <td className="px-1 py-2 text-center border-r border-indigo-200 bg-indigo-50/20">
                    {renderPF(eveningBefore)}
                  </td>
                  <td className="px-1 py-2 text-center border-r border-indigo-200 bg-indigo-50/20">
                    {renderSpO2(eveningBefore)}
                  </td>
                  <td className="px-1 py-2 text-center border-r border-gray-200 bg-indigo-50/20">
                    {renderNote(eveningBefore)}
                  </td>
                  {/* Evening After Med */}
                  <td className="px-1 py-2 text-center border-r border-blue-200 bg-blue-50/20">
                    {renderPF(eveningAfter)}
                  </td>
                  <td className="px-1 py-2 text-center border-r border-blue-200 bg-blue-50/20">
                    {renderSpO2(eveningAfter)}
                  </td>
                  <td className="px-1 py-2 text-center bg-blue-50/20">
                    {renderNote(eveningAfter)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 py-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-medium text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft size={20} className="rotate-180" />
            </button>
          </div>
        )}
      </div>

      {viewingNote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold">
                {t('entry.note')} - {viewingNote.date}
              </h3>
              <button
                onClick={() => setViewingNote(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 prose prose-sm max-w-none">
              <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                {viewingNote.note}
              </ReactMarkdown>
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
    </>
  );
}
