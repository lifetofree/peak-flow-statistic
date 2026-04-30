import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, ChevronDown, ChevronUp } from 'lucide-react';
import DOMPurify from 'dompurify';
import { formatThaiDate } from '../utils/date';
import { getBestReading } from '../utils/zone';
import ZoneBadge from './ZoneBadge';
import type { EntryWithZone } from '../types';

const NOTE_PREVIEW_LENGTH = 100;

export default function EntryCard({ data }: { data: EntryWithZone }) {
  const { t } = useTranslation();
  const { entry, zone } = data;
  const best = getBestReading(entry.peakFlowReadings);
  const [showFullNote, setShowFullNote] = useState(false);

  const createNotePreview = (html: string): string => {
    const textOnly = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return textOnly.length > NOTE_PREVIEW_LENGTH
      ? textOnly.slice(0, NOTE_PREVIEW_LENGTH) + '...'
      : textOnly;
  };

  const zoneColorClass = 'text-gray-700';

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
            <span className="ml-2 font-medium text-xs uppercase">
              {entry.period === 'morning' ? t('entry.morning') : t('entry.evening')}
            </span>
          </span>
        </div>
        {zone && <ZoneBadge zone={zone.zone} percentage={zone.percentage} />}
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <span className="text-gray-500">{t('entry.peakFlow')}: </span>
          <span className={`font-semibold ${zoneColorClass}`}>
            {entry.peakFlowReadings.join(' / ')}
          </span>
          <span className="text-gray-400"> L/min</span>
        </div>
        <div>
          <span className="text-gray-500">{t('entry.spO2')}: </span>
          {entry.spO2 > 0 ? (
            <span className={`font-semibold ${entry.spO2 < 95 ? 'text-red-600' : ''}`}>
              {entry.spO2}%
            </span>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
        <div>
          <span className="text-gray-500">{t('entry.medicationTiming')}: </span>
          <span>{t(`entry.${entry.medicationTiming}`)}</span>
        </div>
      </div>
      <div className={`text-xs mt-1 font-medium ${zoneColorClass}`}>
        Best: {best} L/min {zone && `(${zone.percentage}%)`}
      </div>
      {entry.note && (
        <div className="mt-2 border-t pt-2">
          {showFullNote ? (
            <div 
              className="text-sm text-gray-600 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(entry.note) }}
            />
          ) : (
            <p className="text-sm text-gray-600">
              {createNotePreview(entry.note)}
            </p>
          )}
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
        </div>
      )}
    </div>
  );
}
