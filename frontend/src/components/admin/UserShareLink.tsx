import { useTranslation } from 'react-i18next';
import { Link2 } from 'lucide-react';
import ShareLinkCard from '../ShareLinkCard';

interface UserShareLinkProps {
  shortCode: string;
}

export default function UserShareLink({ shortCode }: UserShareLinkProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
        <Link2 size={20} className="text-blue-600" />
        {t('admin.shareLink')}
      </h3>
      <ShareLinkCard shortCode={shortCode} />
    </div>
  );
}
