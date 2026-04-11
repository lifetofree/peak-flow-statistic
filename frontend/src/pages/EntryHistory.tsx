import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchUserEntries } from '../api/user';
import EntryCard from '../components/EntryCard';

export default function EntryHistory() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['userEntries', token, page],
    queryFn: () => fetchUserEntries(token!, undefined, undefined, undefined, page),
    enabled: !!token,
  });

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/u/${token}`} className="text-blue-600 hover:underline">
          {t('common.back')}
        </Link>
        <h1 className="text-2xl font-bold">{t('user.entryHistory')}</h1>
      </div>

      {isLoading ? (
        <p className="text-center text-gray-500">{t('common.loading')}</p>
      ) : !data || data.entries.length === 0 ? (
        <p className="text-center text-gray-500 py-8">{t('entry.noEntries')}</p>
      ) : (
        <div className="space-y-3">
          {data.entries.map((e) => (
            <EntryCard key={e.entry._id} data={e} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg bg-gray-100 disabled:opacity-50"
          >
            &laquo;
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg bg-gray-100 disabled:opacity-50"
          >
            &raquo;
          </button>
        </div>
      )}
    </div>
  );
}
