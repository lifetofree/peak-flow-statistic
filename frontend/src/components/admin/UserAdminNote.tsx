import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Edit2, Save, X, StickyNote } from 'lucide-react';
import DOMPurify from 'dompurify';
import { updateNote } from '../../api/admin';
import RichTextEditor from '../RichTextEditor';

interface UserAdminNoteProps {
  userId: string;
  adminNote: string;
  queryClient: any;
}

export default function UserAdminNote({ userId, adminNote, queryClient }: UserAdminNoteProps) {
  const { t } = useTranslation();
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(adminNote || '');

  useEffect(() => {
    setNoteText(adminNote || '');
  }, [adminNote]);

  const noteMutation = useMutation({
    mutationFn: () => updateNote(userId, noteText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUser', userId] });
      setEditingNote(false);
    },
    onError: (error: any) => {
      alert(error.message || t('common.error'));
    }
  });

  const startEditingNote = () => {
    setEditingNote(true);
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <StickyNote size={20} className="text-yellow-600" />
          {t('admin.adminNote')}
        </h3>
        {!editingNote && (
          <button 
            onClick={startEditingNote} 
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            <Edit2 size={14} />
            {t('common.edit')}
          </button>
        )}
      </div>
      {editingNote ? (
        <div className="space-y-3">
          <RichTextEditor
            value={noteText}
            onChange={setNoteText}
            placeholder={t('entry.notePlaceholder')}
            minHeight="200px"
          />
          <div className="flex gap-2">
            <button
              onClick={() => noteMutation.mutate()}
              disabled={noteMutation.isPending}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {noteMutation.isPending ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save size={16} />}
              {t('common.save')}
            </button>
            <button
              onClick={() => setEditingNote(false)}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-gray-200 transition-colors"
            >
              <X size={16} />
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div 
          className="prose prose-sm max-w-none bg-gray-50 p-4 rounded-xl border border-dashed min-h-[100px]"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(adminNote || `<p class="text-gray-400 italic">${t('common.noData')}</p>`) }}
        />
      )}
    </div>
  );
}
