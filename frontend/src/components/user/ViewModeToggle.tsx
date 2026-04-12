import { useTranslation } from 'react-i18next';
import { List, LayoutGrid } from 'lucide-react';

interface ViewModeToggleProps {
  viewMode: 'card' | 'list';
  onViewModeChange: (mode: 'card' | 'list') => void;
}

export default function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onViewModeChange('card')}
        className={`p-2 rounded-lg transition-colors ${
          viewMode === 'card' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}
        title="Card View"
      >
        <LayoutGrid size={20} />
      </button>
      <button
        onClick={() => onViewModeChange('list')}
        className={`p-2 rounded-lg transition-colors ${
          viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}
        title="List View"
      >
        <List size={20} />
      </button>
    </div>
  );
}
