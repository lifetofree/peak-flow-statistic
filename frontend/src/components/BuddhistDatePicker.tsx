import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BuddhistDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  maxDate?: string;
  minDate?: string;
  className?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseISO(iso: string): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDisplay(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

const CalendarIcon = () => (
  <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 10h16m-8-3V4M7 7V4m10 3V4M5 20h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Zm3-7h.01v.01H8V13Zm4 0h.01v.01H12V13Zm4 0h.01v.01H16V13Zm-8 4h.01v.01H8V17Zm4 0h.01v.01H12V17Zm4 0h.01v.01H16V17Z" />
  </svg>
);

export default function BuddhistDatePicker({
  value,
  onChange,
  maxDate,
  minDate,
  className = '',
}: BuddhistDatePickerProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selected = parseISO(value);
  const init = selected ?? today;
  const [viewYear, setViewYear] = useState(init.getFullYear());
  const [viewMonth, setViewMonth] = useState(init.getMonth());

  useEffect(() => {
    const d = parseISO(value);
    if (d) { setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }
  }, [value]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const maxD = parseISO(maxDate ?? '');
  const minD = parseISO(minDate ?? '');
  const isDisabled = (d: Date) => (maxD !== null && d > maxD) || (minD !== null && d < minD);
  const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();
  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;

  const cells = Array.from({ length: totalCells }, (_, i) => {
    if (i < firstDow)
      return { date: new Date(viewYear, viewMonth - 1, daysInPrev - firstDow + i + 1), current: false };
    if (i < firstDow + daysInMonth)
      return { date: new Date(viewYear, viewMonth, i - firstDow + 1), current: true };
    return { date: new Date(viewYear, viewMonth + 1, i - firstDow - daysInMonth + 1), current: false };
  });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleDay = (d: Date) => {
    if (isDisabled(d)) return;
    onChange(toISO(d));
    setOpen(false);
  };

  const handleToday = () => {
    if (!isDisabled(today)) { onChange(toISO(today)); setOpen(false); }
  };

  const handleClear = () => { onChange(''); setOpen(false); };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 101 }, (_, i) => currentYear - 80 + i);

  return (
    <div className={`relative ${className}`} ref={ref}>
      {/* Input — Flowbite style with left icon */}
      <div className="relative">
        <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
          <CalendarIcon />
        </div>
        <input
          readOnly
          value={formatDisplay(value)}
          placeholder={t('common.selectDate')}
          onClick={() => setOpen(o => !o)}
          className="block w-full ps-9 pe-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 cursor-pointer placeholder:text-gray-400 shadow-sm"
        />
      </div>

      {/* Popup */}
      {open && (
        <div className="absolute z-50 mt-1 p-4 bg-white border border-gray-200 rounded-lg shadow-lg w-72">

          {/* Navigation header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={prevMonth}
              className="flex items-center justify-center p-2 text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-900 focus:ring-2 focus:ring-gray-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-0.5">
              <select
                value={viewMonth}
                onChange={e => setViewMonth(Number(e.target.value))}
                className="text-sm font-semibold text-gray-900 bg-transparent border-none outline-none cursor-pointer hover:bg-gray-100 rounded-lg px-1 py-1 transition-colors"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <select
                value={viewYear}
                onChange={e => setViewYear(Number(e.target.value))}
                className="text-sm font-semibold text-gray-900 bg-transparent border-none outline-none cursor-pointer hover:bg-gray-100 rounded-lg px-1 py-1 transition-colors"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="flex items-center justify-center p-2 text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-900 focus:ring-2 focus:ring-gray-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day-of-week labels */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-500 p-0.5">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {cells.map(({ date, current }, i) => {
              const disabled = isDisabled(date);
              const sel = selected && isSameDay(date, selected);
              const tod = isSameDay(date, today);

              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleDay(date)}
                  className={[
                    'flex items-center justify-center w-full aspect-square text-sm font-semibold rounded-full transition-colors',
                    sel
                      ? 'bg-blue-700 text-white hover:bg-blue-600'
                      : tod
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : current
                      ? 'text-gray-900 hover:bg-gray-100'
                      : 'text-gray-400 hover:bg-gray-100',
                    disabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : 'cursor-pointer',
                  ].join(' ')}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer — Today & Clear */}
          <div className="flex mt-4 gap-2">
            <button
              type="button"
              onClick={handleToday}
              className="flex-1 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg py-2 hover:bg-gray-100 focus:ring-2 focus:ring-gray-200 transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg py-2 hover:bg-gray-100 focus:ring-2 focus:ring-gray-200 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
