import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  children: React.ReactNode;
  className?: string;
}

const sizeClasses = {
  sm: 'max-h-[40vh]',
  md: 'max-h-[60vh]',
  lg: 'max-h-[80vh]',
  full: 'max-h-[95vh]',
};

const BottomSheet = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  className,
}: BottomSheetProps) => {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-card rounded-t-xl',
          'animate-slide-up overflow-hidden flex flex-col',
          sizeClasses[size],
          className,
        )}
        style={{ boxShadow: 'var(--shadow-elevated)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-muted-foreground/20 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-3 border-b border-border">
            <h3 className="font-bold text-[17px]">{title}</h3>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition-colors">
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 safe-bottom">
          {children}
        </div>
      </div>
    </div>
  );
};

export default BottomSheet;
