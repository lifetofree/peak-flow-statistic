import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, ChevronDown, ChevronUp } from 'lucide-react';
import { formatThaiDate } from '../utils/date';
import type { EntryWithZone } from '../types';

interface EntryCardProps {
  data: EntryWithZone;
}

const NOTE_PREVIEW_LENGTH = 60;

export default function EntryCard({ data }: EntryCardProps) {
  const { t } = useTranslation();
  const { entry } = data;
  const [showFullNote, setShowFullNote] = useState(false);

  const notePreview = entry.note.length > NOTE_PREVIEW_LENGTH
    ? entry.note.slice(0, NOTE_PREVIEW_LENGTH) + '...'
    : entry.note;

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {entry.period === 'morning' ? (
            <Sun className="text-orange-500" size={16} />
          ) : (
            <Moon className="text-indigo-600" size={16} />
          )}
          <span className="text-sm text-gray-500">
            {formatThaiDate(entry.date)}
            <span className="ml-2 font-medium uppercase text-xs">
              {t(`entry.${entry.period}`)}
            </span>
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500">{t('entry.peakFlow')}:</span>{' '}
          <span>{entry.peakFlowReadings.join(' / ')} L/min</span>
        </div>
        <div>
          <span className="text-gray-500">{t('entry.spO2')}:</span>{' '}
          <span className={entry.spO2 < 95 ? 'text-red-600' : ''}>
            {entry.spO2}%
          </span>
        </div>
        <div>
          <span className="text-gray-500">{t('entry.medicationTiming')}:</span>{' '}
          <span>{t(`entry.${entry.medicationTiming}`)}</span>
        </div>
      </div>
      {entry.note && (
        <div className="mt-2 border-t pt-2">
          <p className="text-sm text-gray-600">
            {showFullNote ? entry.note : notePreview}
          </p>
          {entry.note.length > NOTE_PREVIEW_LENGTH && (
            <button
              onClick={() => setShowFullNote(!showFullNote)}
              className="text-xs text-blue-600 hover:underline mt-1 flex items-center gap-1"
            >
              {showFullNote ? (
                <>
                  <ChevronUp size={12} />
                  {t('entry.showLess')}
                </>
              ) : (
                <>
                  <ChevronDown size={12} />
                  {t('entry.showMore')}
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
