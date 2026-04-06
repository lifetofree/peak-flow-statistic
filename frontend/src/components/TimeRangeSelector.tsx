import { useTranslation } from 'react-i18next';

export type TimeRange = 7 | 30 | 90 | 'all';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

const OPTIONS: TimeRange[] = [7, 30, 90, 'all'];

export default function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  const { t } = useTranslation();

  const labels: Record<string, string> = {
    '7': t('chart.days7'),
    '30': t('chart.days30'),
    '90': t('chart.days90'),
    all: t('chart.all'),
  };

  return (
    <div className="flex gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={String(opt)}
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            value === opt
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {labels[String(opt)]}
        </button>
      ))}
    </div>
  );
}
