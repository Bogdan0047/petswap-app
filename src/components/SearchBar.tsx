import React from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  showFilterButton?: boolean;
  onFilterPress?: () => void;
  className?: string;
}

const SearchBar = ({
  placeholder = 'Search…',
  value,
  onChange,
  onClear,
  showFilterButton = false,
  onFilterPress,
  className,
}: SearchBarProps) => (
  <div className={cn('flex gap-2', className)}>
    <div className="relative flex-1">
      <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full pl-11 pr-10 py-3 rounded-md bg-muted text-[15px]',
          'text-foreground placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary/20',
          'transition-all duration-normal',
        )}
      />
      {value && (
        <button
          onClick={() => { onChange(''); onClear?.(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full bg-muted-foreground/20 transition-opacity active:opacity-60"
        >
          <X size={14} className="text-muted-foreground" />
        </button>
      )}
    </div>
    {showFilterButton && (
      <button
        onClick={onFilterPress}
        className="p-3 rounded-md bg-muted text-muted-foreground transition-all duration-fast active:scale-95"
      >
        <SlidersHorizontal size={20} />
      </button>
    )}
  </div>
);

export default SearchBar;
