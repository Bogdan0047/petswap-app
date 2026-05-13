import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  className?: string;
}

const SettingsRow = ({
  icon,
  title,
  subtitle,
  rightElement,
  destructive = false,
  disabled = false,
  onPress,
  className,
}: SettingsRowProps) => (
  <button
    onClick={onPress}
    disabled={disabled}
    className={cn(
      'w-full p-4 rounded-md bg-card flex items-center gap-3 text-left',
      'transition-all duration-fast active:scale-[0.98] hover:bg-muted',
      disabled && 'opacity-50 pointer-events-none',
      className,
    )}
  >
    <span className={cn(destructive ? 'text-destructive' : 'text-muted-foreground')}>
      {icon}
    </span>
    <div className="flex-1 min-w-0">
      <span className={cn('text-[14px] font-medium', destructive && 'text-destructive')}>
        {title}
      </span>
      {subtitle && <p className="text-[12px] text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
    {rightElement || <ChevronRight size={17} className="text-muted-foreground flex-shrink-0" />}
  </button>
);

export default SettingsRow;
