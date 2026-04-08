import { FC } from 'react';

interface SelectProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

const Select: FC<SelectProps> = ({
  label,
  placeholder = 'Select an option',
  value,
  onChange,
  options,
  error,
  disabled = false,
  className = '',
  required = false,
}) => {
  const id = label ? label.toLowerCase().replace(/\s/g, '-') : undefined;

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`block w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm
            appearance-none
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
            transition-all duration-200
            ${disabled ? 'bg-muted opacity-60 cursor-not-allowed' : ''}
            ${error ? 'border-destructive focus:ring-destructive/20' : ''}
            ${!value ? 'text-muted-foreground' : ''}`}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
};

export default Select;