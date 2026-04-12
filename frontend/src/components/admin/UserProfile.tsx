import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Edit2, Save, X, User as UserIcon, FileDown } from 'lucide-react';
import { updateUser } from '../../api/admin';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  personalBest: number | null;
  shortCode: string;
}

interface UserProfileProps {
  user: User;
  queryClient: any;
  onDelete: () => void;
  onExport: () => void;
}

export default function UserProfile({ user, queryClient, onDelete, onExport }: UserProfileProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', nickname: '', personalBest: '' });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateUser(user._id, {
        firstName: form.firstName,
        lastName: form.lastName,
        nickname: form.nickname,
        personalBest: form.personalBest ? Number(form.personalBest) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUser', user._id] });
      setEditing(false);
    },
    onError: (error: any) => {
      alert(error.message || t('common.error'));
    }
  });

  const startEditing = () => {
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      nickname: user.nickname,
      personalBest: user.personalBest ? String(user.personalBest) : '',
    });
    setEditing(true);
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border space-y-4">
      {editing ? (
        <div className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Edit2 size={20} className="text-blue-600" />
            {t('admin.editUser')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder={t('admin.firstName')}
            />
            <input
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder={t('admin.lastName')}
            />
            <input
              value={form.nickname}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder={t('admin.nickname')}
            />
            <input
              type="number"
              placeholder={t('admin.personalBest')}
              value={form.personalBest}
              onChange={(e) => setForm({ ...form, personalBest: e.target.value })}
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {updateMutation.isPending ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save size={16} />}
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
        <div>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-full">
                <UserIcon size={24} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {user.firstName} {user.lastName} ({user.nickname})
                </h2>
                <p className="text-sm text-gray-500">
                  {t('admin.personalBest')}: <span className="font-semibold text-gray-700">{user.personalBest ? `${user.personalBest} L/min` : '-'}</span>
                </p>
                <p className="text-xs text-gray-400 mt-1 uppercase font-medium">
                  Code: {user.shortCode}
                </p>
              </div>
            </div>
            <button
              onClick={startEditing}
              className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
              title={t('common.edit')}
            >
              <Edit2 size={20} />
            </button>
          </div>
          
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={onExport}
              className="bg-white border text-green-600 hover:bg-green-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
              <FileDown size={16} />
              {t('admin.export')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
