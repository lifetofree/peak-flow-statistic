import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const NewEntry = lazy(() => import('./pages/NewEntry'));
const EntryHistory = lazy(() => import('./pages/EntryHistory'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminUserDetail = lazy(() => import('./pages/AdminUserDetail'));
const AdminAuditLog = lazy(() => import('./pages/AdminAuditLog'));
function LoadingFallback() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-lg text-gray-500">{t('common.loading')}</p>
    </div>
  );
}

function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-xl text-gray-600">{t('common.notFound')}</p>
    </div>
  );
}

export default function App() {
  const { t } = useTranslation();
  
  useEffect(() => {
    document.title = t('app.title');
  }, [t]);
  
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/u/:token" element={<UserDashboard />} />
        <Route path="/u/:token/new" element={<NewEntry />} />
        <Route path="/u/:token/entries" element={<EntryHistory />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users/:id" element={<AdminUserDetail />} />
        <Route path="/admin/audit" element={<AdminAuditLog />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
