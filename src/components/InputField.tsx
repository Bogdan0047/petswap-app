import React from 'react';
import { cn } from '@/lib/utils';

interface InputFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>, 'onChange'> {
  label?: string;
  helperText?: string;
  errorText?: string;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
  multiline?: boolean;
  rows?: number;
  value?: string;
  onChange?: (value: string) => void;
}

const InputField = ({
  label,
  helperText,
  errorText,
  prefixIcon,
  suffixIcon,
  multiline = false,
  rows = 3,
  value,
  onChange,
  className,
  disabled,
  ...props
}: InputFieldProps) => {
  const hasError = !!errorText;

  const inputClasses = cn(
    'w-full bg-surface text-foreground placeholder:text-muted-foreground',
    'text-[15px] rounded-md transition-all duration-normal',
    'border border-border-light',
    'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
    hasError && 'border-destructive focus:ring-destructive/20 focus:border-destructive',
    disabled && 'opacity-50 cursor-not-allowed',
    prefixIcon ? 'pl-11 pr-4 py-3.5' : suffixIcon ? 'pl-4 pr-11 py-3.5' : 'px-4 py-3.5',
  );

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="text-[13px] font-semibold text-muted-foreground mb-2 block">
          {label}
        </label>
      )}
      <div className="relative">
        {prefixIcon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
            {prefixIcon}
          </div>
        )}
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            rows={rows}
            disabled={disabled}
            className={cn(inputClasses, 'resize-none')}
            {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            className={inputClasses}
            {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
          />
        )}
        {suffixIcon && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
            {suffixIcon}
          </div>
        )}
      </div>
      {errorText && <p className="text-[12px] text-destructive mt-1.5 font-medium">{errorText}</p>}
      {helperText && !errorText && <p className="text-[12px] text-muted-foreground mt-1.5">{helperText}</p>}
    </div>
  );
};

export default InputField;
