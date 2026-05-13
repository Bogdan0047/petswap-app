import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePresenceHeartbeat } from '@/hooks/usePresence';
import { useNewMessageToasts } from '@/hooks/useNewMessageToasts';
import { trackPushOpenFromUrl, wirePushClickRouter } from '@/lib/pushClient';

/**
 * Mounts app-wide side-effect hooks that depend on router context
 * (e.g. useNavigate). Must be rendered as a child of <BrowserRouter>.
 * Renders nothing — purely a hook host.
 */
const AppHooks = () => {
  usePresenceHeartbeat();
  useNewMessageToasts();
  const navigate = useNavigate();
  useEffect(() => {
    wirePushClickRouter((path) => navigate(path));
    trackPushOpenFromUrl();
  }, [navigate]);
  return null;
};

export default AppHooks;

