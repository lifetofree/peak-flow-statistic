import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { Eye, Edit2 } from 'lucide-react';
import { toISODateString } from '../utils/date';
import { PEAK_FLOW_MIN, PEAK_FLOW_MAX, SPO2_MIN, SPO2_MAX } from '../constants/validation';

interface EntryFormProps {
  onSubmit: (data: {
    date: string;
    peakFlowReadings: [number, number, number];
    spO2: number;
    medicationTiming: 'before' | 'after';
    period: 'morning' | 'evening';
    note: string;
  }) => void;
  isLoading: boolean;
}

export default function EntryForm({ onSubmit, isLoading }: EntryFormProps) {
  const { t } = useTranslation();
  const today = toISODateString(new Date());

  const [date, setDate] = useState(today);
  const [readings, setReadings] = useState<[string, string, string]>(['', '', '']);
  const [spO2, setSpO2] = useState('');
  const [medicationTiming, setMedicationTiming] = useState<'before' | 'after'>('before');
  const [period, setPeriod] = useState<'morning' | 'evening'>('morning');
  const [note, setNote] = useState('');
  const [showNotePreview, setShowNotePreview] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleReadingChange = (index: number, value: string) => {
    const next = [...readings] as [string, string, string];
    next[index] = value;
    setReadings(next);
  };

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!date) {
      errs.push(t('validation.required'));
    } else if (date > today) {
      errs.push(t('validation.futureDate'));
    }

    for (let i = 0; i < 3; i++) {
      const v = Number(readings[i]);
      if (!readings[i] || isNaN(v) || v < PEAK_FLOW_MIN || v > PEAK_FLOW_MAX) {
        errs.push(t('validation.peakFlowRange'));
        break;
      }
    }

    const s = Number(spO2);
    if (!spO2 || isNaN(s) || s < SPO2_MIN || s > SPO2_MAX) {
      errs.push(t('validation.spO2Range'));
    }

    setErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      date: new Date(date).toISOString(),
      peakFlowReadings: readings.map(Number) as [number, number, number],
      spO2: Number(spO2),
      medicationTiming,
      period,
      note,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.length > 0 && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
          {errors.map((err, i) => (
            <p key={i}>{err}</p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('entry.date')}
          </label>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('entry.period')}
          </label>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setPeriod('morning')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                period === 'morning' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              {t('entry.morning')}
            </button>
            <button
              type="button"
              onClick={() => setPeriod('evening')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                period === 'evening' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              {t('entry.evening')}
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('entry.peakFlow')} (L/min)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <input
              key={i}
              type="number"
              placeholder={t('entry.reading', { number: i + 1 })}
              value={readings[i]}
              min={PEAK_FLOW_MIN}
              max={PEAK_FLOW_MAX}
              onChange={(e) => handleReadingChange(i, e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('entry.spO2')} (%)
        </label>
        <input
          type="number"
          value={spO2}
          min={SPO2_MIN}
          max={SPO2_MAX}
          onChange={(e) => setSpO2(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('entry.medicationTiming')}
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="medicationTiming"
              value="before"
              checked={medicationTiming === 'before'}
              onChange={() => setMedicationTiming('before')}
              className="text-blue-600"
            />
            <span>{t('entry.before')}</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="medicationTiming"
              value="after"
              checked={medicationTiming === 'after'}
              onChange={() => setMedicationTiming('after')}
              className="text-blue-600"
            />
            <span>{t('entry.after')}</span>
          </label>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-medium text-gray-700">
            {t('entry.note')}
          </label>
          <button
            type="button"
            onClick={() => setShowNotePreview(!showNotePreview)}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            {showNotePreview ? (
              <>
                <Edit2 size={12} />
                {t('entry.editNote')}
              </>
            ) : (
              <>
                <Eye size={12} />
                {t('entry.previewNote')}
              </>
            )}
          </button>
        </div>
        {showNotePreview ? (
          <div className="border rounded-lg px-3 py-2 min-h-[72px] bg-gray-50 prose prose-sm max-w-none">
            {note ? (
              <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{note}</ReactMarkdown>
            ) : (
              <p className="text-gray-400 italic">{t('entry.noNote')}</p>
            )}
          </div>
        ) : (
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={t('entry.notePlaceholder')}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isLoading ? t('common.loading') : t('entry.submit')}
      </button>
    </form>
  );
}
