import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatThaiDate } from '../utils/date';
import { getBestReading, ZONE_COLORS } from '../utils/zone';
import type { EntryWithZone } from '../types';

interface PeakFlowChartProps {
  entries: EntryWithZone[];
  personalBest: number | null;
}

export default function PeakFlowChart({ entries, personalBest }: PeakFlowChartProps) {
  const { t } = useTranslation();

  const data = [...entries].reverse().map((e) => ({
    date: formatThaiDate(e.entry.date),
    value: getBestReading(e.entry.peakFlowReadings),
  }));

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h3 className="text-lg font-semibold mb-3">{t('chart.peakFlowTrend')}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          {personalBest && (
            <>
              <ReferenceArea
                y1={personalBest * 0.8}
                y2={personalBest}
                fill={ZONE_COLORS.green}
                fillOpacity={0.1}
              />
              <ReferenceArea
                y1={personalBest * 0.5}
                y2={personalBest * 0.8}
                fill={ZONE_COLORS.yellow}
                fillOpacity={0.1}
              />
              <ReferenceArea
                y1={0}
                y2={personalBest * 0.5}
                fill={ZONE_COLORS.red}
                fillOpacity={0.1}
              />
            </>
          )}
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
