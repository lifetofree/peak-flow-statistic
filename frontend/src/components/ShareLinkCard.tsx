import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ShareLinkCardProps {
  shortCode: string;
}

export default function ShareLinkCard({ shortCode }: ShareLinkCardProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const url = `${window.location.origin}/s/${shortCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
      {/* QR Code */}
      <div className="flex-shrink-0 bg-white p-3 rounded-xl border shadow-sm">
        <QRCodeSVG value={url} size={140} level="M" />
      </div>

      {/* URL + Actions */}
      <div className="flex-1 w-full space-y-3">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
            {t('admin.shareLink')}
          </p>
          <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
            <span className="text-sm text-gray-700 break-all flex-1 font-mono">{url}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              copied
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
            }`}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? t('admin.linkCopied') : t('admin.copyLink')}
          </button>


        </div>

        <p className="text-xs text-gray-400">{t('admin.shareLinkHint')}</p>
      </div>
    </div>
  );
}
