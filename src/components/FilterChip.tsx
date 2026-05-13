import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterChipProps {
  label: string;
  selected?: boolean;
  removable?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  className?: string;
}

const FilterChip = ({
  label,
  selected = false,
  removable = false,
  disabled = false,
  onPress,
  onRemove,
  className,
}: FilterChipProps) => (
  <button
    onClick={removable ? onRemove : onPress}
    disabled={disabled}
    className={cn(
      'inline-flex items-center gap-1.5 px-4 py-2 rounded-xs text-[13px] font-semibold',
      'transition-all duration-fast',
      selected
        ? 'bg-primary text-primary-foreground'
        : 'bg-muted text-foreground',
      disabled && 'opacity-40 pointer-events-none',
      className,
    )}
  >
    {label}
    {removable && selected && <X size={12} />}
  </button>
);

export default FilterChip;
