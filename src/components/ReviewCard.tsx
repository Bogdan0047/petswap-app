import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewCardProps {
  reviewerName: string;
  reviewerAvatar?: string;
  rating: number;
  reviewText: string;
  tags?: string[];
  date: string;
  variant?: 'compact' | 'full' | 'featured';
  className?: string;
}

const ReviewCard = ({
  reviewerName,
  reviewerAvatar,
  rating,
  reviewText,
  tags = [],
  date,
  variant = 'full',
  className,
}: ReviewCardProps) => {
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-start gap-3', className)}>
        <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={12} className={i < rating ? 'text-warning' : 'text-muted'} fill={i < rating ? 'currentColor' : 'none'} />
          ))}
        </div>
        <p className="text-[13px] text-muted-foreground line-clamp-2">{reviewText}</p>
      </div>
    );
  }

  return (
    <div className={cn(
      variant === 'featured' ? 'card-elevated p-5 border-l-4 border-primary' : 'card-elevated p-5',
      className,
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-accent overflow-hidden flex-shrink-0">
          {reviewerAvatar ? (
            <img src={reviewerAvatar} alt={reviewerName} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg">🧑</div>
          )}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-[14px]">{reviewerName}</p>
          <p className="text-[11px] text-muted-foreground">{date}</p>
        </div>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={13} className={i < rating ? 'text-warning' : 'text-muted'} fill={i < rating ? 'currentColor' : 'none'} />
          ))}
        </div>
      </div>
      <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">{reviewText}</p>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <span key={tag} className="text-[11px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-semibold">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewCard;
