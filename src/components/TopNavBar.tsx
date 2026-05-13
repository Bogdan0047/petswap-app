import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import UserAvatar from './UserAvatar';

interface TopNavBarProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  rightAction?: React.ReactNode;
  avatarUrl?: string;
  avatarName?: string;
  variant?: 'default' | 'transparent' | 'scrolled';
  className?: string;
}

const TopNavBar = ({
  title,
  subtitle,
  onBack,
  leftIcon,
  rightIcon,
  rightAction,
  avatarUrl,
  avatarName,
  variant = 'default',
  className,
}: TopNavBarProps) => {
  return (
    <div
      className={cn(
        'px-6 pt-6 pb-3 safe-top flex items-center gap-3',
        variant === 'scrolled' && 'border-b border-border bg-card/95 backdrop-blur-xl',
        variant === 'transparent' && 'bg-transparent',
        className,
      )}
    >
      {onBack && (
        <button onClick={onBack} className="p-1 -ml-1 transition-transform active:scale-90">
          <ArrowLeft size={24} />
        </button>
      )}
      {leftIcon && !onBack && <div className="-ml-1">{leftIcon}</div>}

      <div className="flex-1 min-w-0">
        <h1 className="font-bold text-[18px] truncate">{title}</h1>
        {subtitle && <p className="text-[12px] text-muted-foreground truncate">{subtitle}</p>}
      </div>

      {(avatarUrl || avatarName) && (
        <UserAvatar name={avatarName || ''} src={avatarUrl} size={36} rounded={18} />
      )}
      {rightIcon && <div>{rightIcon}</div>}
      {rightAction && <div>{rightAction}</div>}
    </div>
  );
};

export default TopNavBar;
