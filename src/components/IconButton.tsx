import React from 'react';
import { cn } from '@/lib/utils';

type IconButtonVariant = 'neutral' | 'primary' | 'destructive' | 'subtle';
type IconButtonSize = 32 | 40 | 48;

interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  icon: React.ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  label?: string;
  onPress?: () => void;
}

const variantClasses: Record<IconButtonVariant, string> = {
  neutral: 'bg-muted text-foreground',
  primary: 'bg-primary/10 text-primary',
  destructive: 'bg-destructive/10 text-destructive',
  subtle: 'bg-transparent text-muted-foreground hover:bg-muted',
};

const IconButton = ({
  icon,
  variant = 'neutral',
  size = 40,
  label,
  onPress,
  className,
  onClick,
  ...props
}: IconButtonProps) => (
  <button
    onClick={onPress || onClick}
    aria-label={label}
    className={cn(
      'flex items-center justify-center rounded-md transition-all duration-fast active:scale-90',
      variantClasses[variant],
      className,
    )}
    style={{ width: size, height: size }}
    {...props}
  >
    {icon}
  </button>
);

export default IconButton;
