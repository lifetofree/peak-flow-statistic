import { forwardRef } from 'react';
import { Calendar } from 'lucide-react';

interface CustomInputProps {
  value: string;
  onClick: () => void;
  isOpen: boolean;
  className?: string;
  placeholderText?: string;
}

export const CustomInput = forwardRef<HTMLInputElement, CustomInputProps>(
  ({ value, onClick, isOpen, className = '', placeholderText }, ref) => {
    return (
      <div className="relative">
        <input
          ref={ref}
          type="text"
          value={value}
          onClick={onClick}
          readOnly
          placeholder={placeholderText}
          className={`w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base font-medium text-gray-800 bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm cursor-pointer pr-12 ${className}`}
        />
        <button
          type="button"
          onClick={onClick}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Calendar className="text-blue-600 w-5 h-5" />
        </button>
      </div>
    );
  }
);

CustomInput.displayName = 'CustomInput';
