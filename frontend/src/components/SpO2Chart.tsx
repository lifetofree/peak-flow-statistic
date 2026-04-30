import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatThaiDate } from '../utils/date';
import type { EntryWithZone } from '../types';

interface SpO2ChartProps {
  entries: EntryWithZone[];
}

export default function SpO2Chart({ entries }: SpO2ChartProps) {
  const { t } = useTranslation();

  const data = [...entries]
    .reverse()
    .filter((e) => e.entry.spO2 && e.entry.spO2 > 0)
    .map((e) => ({
      date: formatThaiDate(e.entry.date),
      value: e.entry.spO2,
    }));

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h3 className="text-lg font-semibold mb-3">{t('chart.spO2Trend')}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis domain={[70, 100]} tick={{ fontSize: 12 }} />
          <Tooltip />
          <ReferenceLine y={95} stroke="#ef4444" strokeDasharray="5 5" label="95%" />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
