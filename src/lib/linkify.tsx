import React from 'react';

const URL_RE = /\b((?:https?:\/\/|www\.)[^\s<>]+[^\s<>.,!?;:'")\]])/gi;

/**
 * Splits a string into text + anchor nodes. Safe for chat bubbles.
 * Matches http(s)://… and www.… URLs.
 */
export const linkify = (
  text: string,
  linkClassName = 'underline underline-offset-2 break-all',
): React.ReactNode => {
  if (!text) return text;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
    const raw = m[0];
    const href = raw.startsWith('http') ? raw : `https://${raw}`;
    parts.push(
      <a
        key={`${m.index}-${raw}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className={linkClassName}
        onClick={(e) => e.stopPropagation()}
      >
        {raw}
      </a>,
    );
    lastIndex = m.index + raw.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : text;
};
