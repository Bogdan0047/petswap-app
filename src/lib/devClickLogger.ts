/**
 * Dev-only global click & navigation logger.
 *
 * Emits:
 *   BUTTON_CLICKED: <label>
 *   NAVIGATE_TO:    <route>
 *   MODAL_OPENED:   <modal name>   (via logModalOpen helper)
 *   ACTION_SUCCESS / ACTION_FAILED (via logAction helper)
 *
 * Stripped from production builds (import.meta.env.PROD short-circuits).
 * Safe to call install() multiple times; idempotent.
 */

let installed = false;

const isDev = () => !import.meta.env.PROD;

/** Best-effort label for a clicked element. */
const labelFor = (el: Element): string => {
  const aria = el.getAttribute('aria-label');
  if (aria) return aria.trim();
  const title = el.getAttribute('title');
  if (title) return title.trim();
  const text = (el as HTMLElement).innerText?.trim();
  if (text) return text.replace(/\s+/g, ' ').slice(0, 60);
  const role = el.getAttribute('role');
  const tag = el.tagName.toLowerCase();
  return `${tag}${role ? `[role=${role}]` : ''}`;
};

/** Walk up to find the nearest interactive ancestor. */
const findInteractive = (start: Element | null): Element | null => {
  let el: Element | null = start;
  while (el && el !== document.body) {
    const tag = el.tagName?.toLowerCase();
    const role = el.getAttribute?.('role');
    if (
      tag === 'button' ||
      tag === 'a' ||
      role === 'button' ||
      role === 'link' ||
      role === 'tab' ||
      role === 'menuitem' ||
      (el as HTMLElement).onclick != null
    ) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
};

export const installDevClickLogger = () => {
  if (!isDev() || installed || typeof window === 'undefined') return;
  installed = true;

  // 1) Global click capture
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target as Element | null;
      const interactive = findInteractive(target);
      if (!interactive) return;
      const label = labelFor(interactive);
      const tag = interactive.tagName.toLowerCase();
      const href = (interactive as HTMLAnchorElement).href ?? '';
      // eslint-disable-next-line no-console
      console.log(`BUTTON_CLICKED: ${label}${tag === 'a' && href ? ` → ${href}` : ''}`);
    },
    true,
  );

  // 2) Navigation logging — wrap history methods so React Router pushes log too.
  const wrap = (key: 'pushState' | 'replaceState') => {
    const original = history[key].bind(history);
    history[key] = function (...args: Parameters<typeof original>) {
      const url = args[2];
      const result = original(...args);
      if (url != null) {
        // eslint-disable-next-line no-console
        console.log(`NAVIGATE_TO: ${String(url)} (${key})`);
      }
      return result;
    } as typeof original;
  };
  wrap('pushState');
  wrap('replaceState');
  window.addEventListener('popstate', () => {
    // eslint-disable-next-line no-console
    console.log(`NAVIGATE_TO: ${location.pathname}${location.search} (popstate)`);
  });

  // eslint-disable-next-line no-console
  console.log('[devClickLogger] installed');
};

export const logModalOpen = (name: string) => {
  if (!isDev()) return;
  // eslint-disable-next-line no-console
  console.log(`MODAL_OPENED: ${name}`);
};

export const logAction = (name: string, ok: boolean, detail?: unknown) => {
  if (!isDev()) return;
  // eslint-disable-next-line no-console
  console.log(`${ok ? 'ACTION_SUCCESS' : 'ACTION_FAILED'}: ${name}`, detail ?? '');
};
