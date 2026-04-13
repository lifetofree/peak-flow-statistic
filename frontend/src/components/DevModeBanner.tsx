import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

/**
 * DevModeBanner - Displays a banner at the top of the page when running in dev mode
 * 
 * Conditions for showing the banner:
 * 1. VITE_GIT_BRANCH environment variable is set to 'pfs'
 * 2. The application is running on localhost (hostname is 'localhost' or '127.0.0.1')
 */
export default function DevModeBanner() {
  const { t } = useTranslation();
  const [isDevMode, setIsDevMode] = useState(false);

  useEffect(() => {
    // Check if we're on the pfs branch
    const isPfsBranch = import.meta.env.VITE_GIT_BRANCH === 'pfs';
    
    // Check if we're running on localhost
    const isLocalhost = 
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '';
    
    setIsDevMode(isPfsBranch && isLocalhost);
  }, []);

  if (!isDevMode) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500/75 text-white text-center py-2 px-4 text-sm font-medium shadow-md">
      {t('common.devMode')}
    </div>
  );
}
