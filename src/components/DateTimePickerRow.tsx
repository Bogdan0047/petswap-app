import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateTimePickerRowProps {
  dateLabel?: string;
  dateValue?: string;
  timeLabel?: string;
  timeValue?: string;
  onDatePress?: () => void;
  onTimePress?: () => void;
  className?: string;
}

const DateTimePickerRow = ({
  dateLabel = 'Date',
  dateValue,
  timeLabel = 'Time',
  timeValue,
  onDatePress,
  onTimePress,
  className,
}: DateTimePickerRowProps) => (
  <div className={cn('flex gap-3', className)}>
    <button
      onClick={onDatePress}
      className="flex-1 flex items-center gap-3 p-4 rounded-md border border-border-light bg-surface transition-all duration-fast active:scale-[0.98]"
    >
      <Calendar size={20} className="text-primary flex-shrink-0" />
      <div className="text-left">
        <p className="text-[12px] text-muted-foreground font-medium">{dateLabel}</p>
        <p className="text-[15px] font-semibold">{dateValue || 'Select'}</p>
      </div>
    </button>
    <button
      onClick={onTimePress}
      className="flex-1 flex items-center gap-3 p-4 rounded-md border border-border-light bg-surface transition-all duration-fast active:scale-[0.98]"
    >
      <Clock size={20} className="text-primary flex-shrink-0" />
      <div className="text-left">
        <p className="text-[12px] text-muted-foreground font-medium">{timeLabel}</p>
        <p className="text-[15px] font-semibold">{timeValue || 'Select'}</p>
      </div>
    </button>
  </div>
);

export default DateTimePickerRow;
