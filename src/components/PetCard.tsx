import React from 'react';
import { cn } from '@/lib/utils';

interface PetCardProps {
  name: string;
  breed: string;
  size: string;
  temperament: string;
  imageUrl?: string;
  emoji?: string;
  careNotes?: string;
  variant?: 'compact' | 'detail' | 'editable';
  onPress?: () => void;
  className?: string;
}

const PetCard = ({
  name,
  breed,
  size,
  temperament,
  imageUrl,
  emoji = '🐾',
  careNotes,
  variant = 'compact',
  onPress,
  className,
}: PetCardProps) => {
  if (variant === 'compact') {
    return (
      <button
        onClick={onPress}
        className={cn('card-elevated p-4 w-full flex items-center gap-4 text-left transition-all duration-fast active:scale-[0.98]', className)}
      >
        <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full bg-accent flex items-center justify-center text-2xl">{emoji}</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px]">{name}</p>
          <p className="text-[12px] text-muted-foreground">{breed} · {size} · {temperament}</p>
        </div>
      </button>
    );
  }

  return (
    <div className={cn('card-elevated p-5', className)}>
      <div className="flex items-center gap-4 mb-3">
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full bg-accent flex items-center justify-center text-3xl">{emoji}</div>
          )}
        </div>
        <div>
          <p className="font-bold text-[16px]">{name}</p>
          <p className="text-[13px] text-muted-foreground">{breed} · {size}</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">{temperament}</p>
        </div>
      </div>
      {careNotes && (
        <p className="text-[13px] text-muted-foreground leading-relaxed">{careNotes}</p>
      )}
    </div>
  );
};

export default PetCard;
