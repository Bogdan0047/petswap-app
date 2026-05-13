import { useNavigate } from 'react-router-dom';
import { Rocket } from 'lucide-react';

/**
 * Tiny floating launcher (dev-only) that opens the Safe Auto Publish dashboard.
 * Sits above the build label, never visible in production.
 */
const SafePublishLauncher = () => {
  const navigate = useNavigate();
  if (import.meta.env.PROD) return null;
  return (
    <button
      onClick={() => navigate('/dev/publish')}
      aria-label="Open Safe Auto Publish"
      title="Safe Auto Publish"
      style={{
        position: 'fixed',
        bottom: 30,
        left: 6,
        zIndex: 9999,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 9px',
        borderRadius: 999,
        background: 'hsl(var(--primary))',
        color: 'hsl(var(--primary-foreground))',
        fontSize: 11,
        fontWeight: 600,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      <Rocket size={12} /> Safe Publish
    </button>
  );
};

export default SafePublishLauncher;
