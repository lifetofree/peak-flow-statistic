import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function AdminLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/admin', { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-lg text-gray-500">{t('common.loading')}</p>
    </div>
  );
}
