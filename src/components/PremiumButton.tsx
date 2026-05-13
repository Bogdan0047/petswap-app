import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'success' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface PremiumButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  label?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  destructive: 'btn-destructive',
  success: 'btn-primary', // uses same green
  outline: 'btn-outline',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'text-[13px] px-4 py-2',
  md: 'text-[15px] px-5 py-3',
  lg: 'text-[17px] px-6 py-3.5',
};

const PremiumButton = ({
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  loading = false,
  fullWidth = false,
  label,
  children,
  className,
  disabled,
  ...props
}: PremiumButtonProps) => (
  <button
    className={cn(
      variantClasses[variant],
      sizeClasses[size],
      fullWidth && 'w-full',
      'inline-flex items-center justify-center gap-2',
      className,
    )}
    disabled={disabled || loading}
    {...props}
  >
    {loading ? (
      <Loader2 size={18} className="animate-spin" />
    ) : (
      <>
        {iconLeft}
        {label || children}
        {iconRight}
      </>
    )}
  </button>
);

export default PremiumButton;
