import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchAuditLogs } from '../api/admin';
import { formatThaiDateTime } from '../utils/date';

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE'] as const;

export default function AdminAuditLog() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['auditLogs', page, actionFilter],
    queryFn: () => fetchAuditLogs(page, undefined, actionFilter || undefined),
  });

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  const actionColor: Record<string, string> = {
    CREATE: 'text-green-700 bg-green-50',
    UPDATE: 'text-blue-700 bg-blue-50',
    DELETE: 'text-red-700 bg-red-50',
  };

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin" className="text-blue-600 hover:underline">
          {t('common.back')}
        </Link>
        <h1 className="text-2xl font-bold">{t('admin.auditLog')}</h1>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {
            setActionFilter('');
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-lg text-sm ${!actionFilter ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          {t('chart.all')}
        </button>
        {ACTIONS.map((a) => (
          <button
            key={a}
            onClick={() => {
              setActionFilter(a);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm ${actionFilter === a ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            {a}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-center text-gray-500">{t('common.loading')}</p>
      ) : !data || data.logs.length === 0 ? (
        <p className="text-center text-gray-500 py-8">{t('entry.noEntries')}</p>
      ) : (
        <div className="space-y-3">
          {data.logs.map((log) => (
            <div key={log._id} className="bg-white rounded-lg p-4 shadow-sm border text-sm">
              <div className="flex justify-between items-start mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColor[log.action] || ''}`}>
                  {log.action}
                </span>
                <span className="text-gray-400 text-xs">
                  {formatThaiDateTime(log.timestamp)}
                </span>
              </div>
              <p className="text-gray-600">
                <span className="font-medium">{log.adminId}</span> {log.action.toLowerCase()}{' '}
                {log.targetModel} <span className="text-gray-400 text-xs">({log.targetId})</span>
              </p>
              {log.diff && (log.diff.before || log.diff.after) && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-400 cursor-pointer">Diff</summary>
                  <pre className="text-xs mt-1 bg-gray-50 p-2 rounded overflow-x-auto">
                    {JSON.stringify(log.diff, null, 2)}
                  </pre>
                </details>
              )}
            </div>
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
