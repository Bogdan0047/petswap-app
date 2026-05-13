import React from 'react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  className?: string;
}

const SectionHeader = ({ title, subtitle, action, onAction, className }: SectionHeaderProps) => (
  <div className={cn('flex items-center justify-between mb-4', className)}>
    <div>
      <h2 className="heading-md">{title}</h2>
      {subtitle && <p className="text-[13px] text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
    {action && onAction && (
      <button onClick={onAction} className="text-primary text-[14px] font-semibold transition-opacity active:opacity-70">
        {action}
      </button>
    )}
  </div>
);

export default SectionHeader;
