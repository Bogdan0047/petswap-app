import { useState } from 'react';
import { Flag, Ban, MoreHorizontal } from 'lucide-react';
import ReportSheet from './ReportSheet';
import BlockSheet from './BlockSheet';
import { cn } from '@/lib/utils';

interface UserActionsMenuProps {
  userId: string;
  userName?: string;
  variant?: 'icon' | 'inline';
  className?: string;
  onBlocked?: () => void;
}

/** Combined Report + Block menu used on profiles, cards and chat headers. */
const UserActionsMenu = ({ userId, userName, variant = 'icon', className, onBlocked }: UserActionsMenuProps) => {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  const openReport = () => { setOpen(false); setReportOpen(true); };
  const openBlock = () => { setOpen(false); setBlockOpen(true); };

  return (
    <>
      {variant === 'icon' ? (
        <div className={cn('relative', className)}>
          <button
            onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
            aria-label="More actions"
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <MoreHorizontal size={20} />
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 w-52 bg-card rounded-md shadow-elevated border border-border overflow-hidden animate-fade-in">
                <button onClick={openReport} className="w-full flex items-center gap-3 px-4 py-3 text-[14px] hover:bg-muted text-left">
                  <Flag size={16} className="text-destructive" /> Report user
                </button>
                <button onClick={openBlock} className="w-full flex items-center gap-3 px-4 py-3 text-[14px] hover:bg-muted text-left border-t border-border">
                  <Ban size={16} className="text-destructive" /> Block user
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className={cn('flex gap-5', className)}>
          <button onClick={openReport} className="flex items-center gap-2 text-[13px] text-destructive font-semibold">
            <Flag size={15} /> Report
          </button>
          <button onClick={openBlock} className="flex items-center gap-2 text-[13px] text-destructive font-semibold">
            <Ban size={15} /> Block
          </button>
        </div>
      )}

      <ReportSheet
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        reportedUserId={userId}
        reportedUserName={userName}
      />
      <BlockSheet
        isOpen={blockOpen}
        onClose={() => setBlockOpen(false)}
        userId={userId}
        userName={userName}
        onBlocked={onBlocked}
      />
    </>
  );
};

export default UserActionsMenu;
