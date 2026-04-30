/**
 * EntryForm - Simplified form for recording peak flow measurements.
 * 
 * Collects: 3 peak flow readings, SpO2, medication timing (before/after),
 * morning/evening period, and optional rich text notes.
 * 
 * Validation rules:
 * - Date cannot be in the future
 * - Peak flow readings: 50-900 L/min
 * - SpO2: 70-100% (Optional, defaults to 0)
 * 
 * Uses toggle buttons (gray background) for period and medication timing.
 * SpO2 and medication timing are on the same row for mobile layout.
 * Rich text notes use RichTextEditor with DOMPurify sanitization on render.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toISODateString } from '../utils/date';
import { PEAK_FLOW_MIN, PEAK_FLOW_MAX, SPO2_MIN, SPO2_MAX } from '../constants/validation';
import RichTextEditor from './RichTextEditor';
import BuddhistDatePicker from './BuddhistDatePicker';

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

    if (spO2) {
      const s = Number(spO2);
      if (isNaN(s) || s < SPO2_MIN || s > SPO2_MAX || !Number.isInteger(s)) {
        errs.push(t('validation.spO2Range'));
      }
    }

    setErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      date,
      peakFlowReadings: readings.map(Number) as [number, number, number],
      spO2: spO2 ? Number(spO2) : 0,
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
          <BuddhistDatePicker
            value={date}
            onChange={setDate}
            maxDate={today}
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('entry.spO2')} (%)
          </label>
          <input
            type="number"
            value={spO2}
            min={SPO2_MIN}
            max={SPO2_MAX}
            step="1"
            onChange={(e) => setSpO2(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('entry.medicationTiming')}
          </label>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setMedicationTiming('before')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                medicationTiming === 'before' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              {t('entry.before')}
            </button>
            <button
              type="button"
              onClick={() => setMedicationTiming('after')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                medicationTiming === 'after' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              {t('entry.after')}
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('entry.note')}
        </label>
        <RichTextEditor
          value={note}
          onChange={setNote}
          placeholder={t('entry.notePlaceholder')}
          minHeight="100px"
        />
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
