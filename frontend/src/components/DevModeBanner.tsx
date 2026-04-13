import { useTranslation } from 'react-i18next';

/**
 * DevModeBanner - Displays a banner at the top of the page when running in development mode
 * 
 * Shows banner when VITE_DEV_BANNER=true is set in .env.development
 * Uses import.meta.env.MODE to detect 'development' vs 'production'
 */
export default function DevModeBanner() {
  const { t } = useTranslation();

  const isDevMode = import.meta.env.MODE === 'development';
  const showBanner = isDevMode && import.meta.env.VITE_DEV_BANNER === 'true';

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500/75 text-white text-center py-2 px-4 text-sm font-medium shadow-md">
      {t('common.devMode')}
    </div>
  );
}
