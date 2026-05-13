import React from 'react';
import { cn } from '@/lib/utils';

interface AppContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  padded?: boolean;
  background?: 'primary' | 'secondary';
  className?: string;
}

const AppContainer = ({
  children,
  scrollable = true,
  padded = true,
  background = 'primary',
  className,
}: AppContainerProps) => {
  const bgClass = background === 'secondary' ? 'bg-background-secondary' : 'bg-background';

  return (
    <div
      className={cn(
        'min-h-screen flex flex-col',
        bgClass,
        scrollable && 'overflow-y-auto',
        !scrollable && 'overflow-hidden',
        className,
      )}
    >
      <div className={cn('flex-1', padded && 'px-6')}>
        {children}
      </div>
    </div>
  );
};

export default AppContainer;
