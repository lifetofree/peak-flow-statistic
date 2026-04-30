import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Edit2, Save, X, MessageSquare } from 'lucide-react';
import DOMPurify from 'dompurify';
import { updateUserNote } from '../../api/admin';
import RichTextEditor from '../RichTextEditor';

interface UserPatientNoteProps {
  userId: string;
  userNote: string;
  queryClient: any;
}

export default function UserPatientNote({ userId, userNote, queryClient }: UserPatientNoteProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(userNote || '');

  useEffect(() => {
    setText(userNote || '');
  }, [userNote]);

  const mutation = useMutation({
    mutationFn: () => updateUserNote(userId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUser', userId] });
      setEditing(false);
    },
    onError: (error: any) => {
      alert(error.message || t('common.error'));
    }
  });

  return (
    <div className="bg-purple-50 rounded-xl p-6 shadow-sm border-2 border-purple-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg flex items-center gap-2 text-purple-900">
          <MessageSquare size={20} className="text-purple-600" />
          {t('entry.noteFromPatient')}
        </h3>
        {!editing && (
          <button 
            onClick={() => setEditing(true)} 
            className="text-sm text-purple-600 hover:underline flex items-center gap-1 font-bold"
          >
            <Edit2 size={14} />
            {t('common.edit')}
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-3">
          <RichTextEditor
            value={text}
            onChange={setText}
            placeholder={t('entry.notePlaceholder')}
            minHeight="150px"
          />
          <div className="flex gap-2">
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {mutation.isPending ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save size={16} />}
              {t('common.save')}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-gray-100 border border-purple-200 transition-colors"
            >
              <X size={16} />
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div 
          className="prose prose-sm max-w-none bg-white p-5 rounded-xl border border-purple-100 shadow-sm min-h-[80px]"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userNote || `<p class="text-gray-400 italic text-center">${t('common.noData')}</p>`) }}
        />
      )}
    </div>
  );
}
