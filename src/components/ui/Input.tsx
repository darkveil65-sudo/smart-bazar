import { FC } from 'react';

interface InputProps {
  type?: string;
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  icon?: React.ReactNode;
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
  icon,
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
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        <input
          type={type}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`block w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm
            placeholder:text-muted-foreground
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
            transition-all duration-200
            ${icon ? 'pl-10' : ''}
            ${disabled ? 'bg-muted opacity-60 cursor-not-allowed' : ''}
            ${error ? 'border-destructive focus:ring-destructive/20' : ''}`}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
};

export default Input;