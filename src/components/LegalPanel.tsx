import React from 'react';
import { cn } from '@/lib/utils';

interface LegalPanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const LegalPanel = ({ title, children, className }: LegalPanelProps) => (
  <div className={cn('card-flat p-5', className)}>
    {title && <h3 className="font-bold text-[16px] mb-3">{title}</h3>}
    <div className="text-[14px] text-muted-foreground leading-[1.7] space-y-3">
      {children}
    </div>
  </div>
);

export default LegalPanel;
