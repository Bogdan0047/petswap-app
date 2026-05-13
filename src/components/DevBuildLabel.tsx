/**
 * Tiny fixed label shown only in dev/preview builds (never in production).
 * Helps confirm at a glance which build is loaded vs what's live on petswap.co.uk.
 */
const DevBuildLabel = () => {
  if (import.meta.env.PROD) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 6,
        left: 6,
        zIndex: 9999,
        padding: "3px 7px",
        borderRadius: 6,
        background: "rgba(15,23,42,0.78)",
        color: "#fff",
        fontSize: 10,
        fontFamily: "ui-monospace, monospace",
        letterSpacing: 0.3,
        pointerEvents: "none",
      }}
    >
      build: prod-readiness-v3
    </div>
  );
};

export default DevBuildLabel;
