import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { th } from 'date-fns/locale/th';
import { useTranslation } from 'react-i18next';

interface BuddhistDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  maxDate?: string;
  minDate?: string;
  className?: string;
}

const BE_OFFSET = 543;

function toBuddhistEra(date: Date): Date {
  const ceDate = new Date(date);
  ceDate.setFullYear(ceDate.getFullYear() - BE_OFFSET);
  return ceDate;
}

function toChristianEra(date: Date): Date {
  const beDate = new Date(date);
  beDate.setFullYear(beDate.getFullYear() + BE_OFFSET);
  return beDate;
}

export default function BuddhistDatePicker({
  value,
  onChange,
  maxDate,
  minDate,
  className = '',
}: BuddhistDatePickerProps) {
  const { t } = useTranslation();

  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year + BE_OFFSET, month - 1, day);
  });

  useEffect(() => {
    if (!value) {
      setSelectedDate(null);
      return;
    }
    const [year, month, day] = value.split('-').map(Number);
    setSelectedDate(new Date(year + BE_OFFSET, month - 1, day));
  }, [value]);

  const handleChange = (date: Date | null) => {
    if (!date) {
      onChange('');
      return;
    }
    const ceDate = toChristianEra(date);
    const iso = `${ceDate.getFullYear()}-${String(ceDate.getMonth() + 1).padStart(2, '0')}-${String(ceDate.getDate()).padStart(2, '0')}`;
    onChange(iso);
  };

  return (
    <DatePicker
      selected={selectedDate}
      onChange={handleChange}
      dateFormat="dd/MM/yyyy"
      locale={th}
      showYearDropdown
      scrollableYearDropdown
      yearDropdownItemNumber={20}
      maxDate={maxDate ? toBuddhistEra(new Date(maxDate)) : undefined}
      minDate={minDate ? toBuddhistEra(new Date(minDate)) : undefined}
      className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 ${className}`}
      placeholderText={t('common.selectDate')}
    />
  );
}
