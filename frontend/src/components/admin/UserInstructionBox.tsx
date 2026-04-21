import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Edit2, Save, X, Info } from 'lucide-react';
import DOMPurify from 'dompurify';
import { updateInstruction } from '../../api/admin';
import RichTextEditor from '../RichTextEditor';

interface UserInstructionBoxProps {
  userId: string;
  instructionBox: string;
  queryClient: any;
}

export default function UserInstructionBox({ userId, instructionBox, queryClient }: UserInstructionBoxProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(instructionBox || '');

  useEffect(() => {
    setText(instructionBox || '');
  }, [instructionBox]);

  const mutation = useMutation({
    mutationFn: () => updateInstruction(userId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUser', userId] });
      setEditing(false);
    },
    onError: (error: any) => {
      alert(error.message || t('common.error'));
    }
  });

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Info size={20} className="text-blue-600" />
          {t('admin.instructionBox')}
        </h3>
        {!editing && (
          <button 
            onClick={() => setEditing(true)} 
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
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
            placeholder={t('admin.instructionPlaceholder')}
            minHeight="200px"
          />
          <div className="flex gap-2">
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {mutation.isPending ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save size={16} />}
              {t('common.save')}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-gray-200 transition-colors"
            >
              <X size={16} />
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div 
          className="prose prose-sm max-w-none bg-blue-50 p-4 rounded-xl border border-blue-100 min-h-[100px]"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(instructionBox || `<p class="text-gray-400 italic">${t('common.noData')}</p>`) }}
        />
      )}
    </div>
  );
}
