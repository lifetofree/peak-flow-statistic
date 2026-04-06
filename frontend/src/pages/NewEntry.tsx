import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { createEntry } from '../api/user';
import EntryForm from '../components/EntryForm';

export default function NewEntry() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof createEntry>[1]) => createEntry(token!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userEntries', token] });
      navigate(`/u/${token}`);
    },
  });

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/u/${token}`} className="text-blue-600 hover:underline">
          {t('common.back')}
        </Link>
        <h1 className="text-2xl font-bold">{t('user.addEntry')}</h1>
      </div>

      {mutation.isError && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">
          {t('common.error')}
        </div>
      )}

      <EntryForm onSubmit={(data) => mutation.mutate(data)} isLoading={mutation.isPending} />
    </div>
  );
}
