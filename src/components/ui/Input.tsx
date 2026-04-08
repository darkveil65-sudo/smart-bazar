import { FC, ReactNode } from 'react';

interface InputProps {
  type?: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

const Input: FC<InputProps> = ({
  type = 'text',
  label,
  placeholder = '',
  value,
  onChange,
  error,
  disabled = false,
  className = '',
  required = false,
}) => {
  return (
    <div className={`mb-4 ${className}`}>
      <label htmlFor={label.toLowerCase().replace(/\s/g, '-')}
        className={`block text-sm font-medium text-gray-700 mb-1 ${required ? 'text-red-600' : ''}`}>
        {label}{required && <span className="ml-1 text-red-600">*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          id={label.toLowerCase().replace(/\s/g, '-')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`block w-full rounded-md border-gray-300 shadow-sm 
                    focus:border-primary-500 focus:ring-primary-500 sm:text-sm
                    ${disabled ? 'bg-gray-50 opacity-50' : ''}
                    ${error ? 'border-red-500' : ''}`}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default Input;