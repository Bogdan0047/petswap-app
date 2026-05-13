/**
 * Console error recorder — dev-only.
 *
 * Wraps console.error / console.warn and listens for window 'error' and
 * 'unhandledrejection' events so the Auto Publish Guard can verify there
 * are no recent runtime errors before allowing a publish.
 *
 * Idempotent. Stripped from production builds.
 */

export interface RecordedError {
  message: string;
  source: 'console.error' | 'console.warn' | 'window.error' | 'unhandledrejection';
  ts: number;
}

const MAX = 50;
const buffer: RecordedError[] = [];
let installed = false;

const push = (entry: RecordedError) => {
  buffer.push(entry);
  if (buffer.length > MAX) buffer.shift();
};

const safeStringify = (args: unknown[]): string => {
  try {
    return args
      .map((a) => {
        if (a instanceof Error) return a.message;
        if (typeof a === 'string') return a;
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      })
      .join(' ')
      .slice(0, 300);
  } catch {
    return '<unserializable>';
  }
};

/**
 * Some warnings are noisy and not blocking (e.g. React dev warnings about
 * forwardRef on third-party components). The guard ignores these so a
 * single library quirk doesn't permanently block publishing.
 */
const IGNORED_PATTERNS: RegExp[] = [
  /Function components cannot be given refs/i,
  /Download the React DevTools/i,
  /\[vite\] connecting/i,
  /\[vite\] connected/i,
  /defaultProps will be removed/i,
];

const isIgnored = (msg: string) => IGNORED_PATTERNS.some((re) => re.test(msg));

export const installConsoleErrorRecorder = () => {
  if (installed || typeof window === 'undefined') return;
  if (import.meta.env.PROD) return;
  installed = true;

  const origError = console.error.bind(console);
  const origWarn = console.warn.bind(console);

  console.error = (...args: unknown[]) => {
    const msg = safeStringify(args);
    if (!isIgnored(msg)) push({ message: msg, source: 'console.error', ts: Date.now() });
    origError(...args);
  };
  console.warn = (...args: unknown[]) => {
    const msg = safeStringify(args);
    // Only treat warnings as blocking when they look like real issues.
    if (!isIgnored(msg) && /failed|error|cannot|undefined|null/i.test(msg)) {
      push({ message: msg, source: 'console.warn', ts: Date.now() });
    }
    origWarn(...args);
  };

  window.addEventListener('error', (e) => {
    const msg = e.message || String(e.error ?? 'Unknown error');
    if (!isIgnored(msg)) push({ message: msg, source: 'window.error', ts: Date.now() });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason = (e as PromiseRejectionEvent).reason;
    const msg = reason instanceof Error ? reason.message : safeStringify([reason]);
    if (!isIgnored(msg)) push({ message: msg, source: 'unhandledrejection', ts: Date.now() });
  });
};

/** Errors recorded since `sinceTs` (defaults to all). */
export const getRecordedErrors = (sinceTs = 0): RecordedError[] =>
  buffer.filter((e) => e.ts >= sinceTs).slice();

export const clearRecordedErrors = () => {
  buffer.length = 0;
};
