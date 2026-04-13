import { useTranslation } from 'react-i18next';
import type { Zone } from '../types';

interface ZoneBadgeProps {
  zone: Zone;
  percentage: number;
}

const ZONE_STYLES: Record<Zone, string> = {
  green: 'bg-zone-green/20 text-green-800 border-zone-green',
  orange: 'bg-zone-orange/20 text-orange-800 border-zone-orange',
  yellow: 'bg-zone-yellow/20 text-yellow-800 border-zone-yellow',
  red: 'bg-zone-red/20 text-red-800 border-zone-red',
};

export default function ZoneBadge({ zone, percentage }: ZoneBadgeProps) {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-medium border ${ZONE_STYLES[zone]}`}
    >
      {t(`zone.${zone}`)} ({percentage}%)
    </span>
  );
}
