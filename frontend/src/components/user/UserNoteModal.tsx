import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import { X } from 'lucide-react';
import { formatThaiDate } from '../../utils/date';

interface UserNoteModalProps {
  note: string;
  date: string;
  onClose: () => void;
}

export default function UserNoteModal({ note, date, onClose }: UserNoteModalProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-auto">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-bold">{t('entry.note')} - {formatThaiDate(date)}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        <div 
          className="p-4 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note) }}
        />
        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
