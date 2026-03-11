import React from 'react';
import { EN_RU_DICTIONARY } from '../data/dictionary';

function cleanToken(token: string): { base: string; prefix: string; suffix: string } {
  const match = token.match(/^([(\["']?)(.*?)([.,!?;)"']*)$/);
  if (!match) {
    return { base: token, prefix: '', suffix: '' };
  }
  const [, prefix, base, suffix] = match;
  return { base, prefix, suffix };
}

export function renderWithHints(text: string): React.ReactNode {
  const parts = text.split(' ');

  return (
    <>
      {parts.map((part, index) => {
        const { base, prefix, suffix } = cleanToken(part);
        const key = `${base}-${index}`;
        const lower = base.toLowerCase();
        const translation = EN_RU_DICTIONARY[lower];

        if (!translation || !base) {
          return (
            <React.Fragment key={key}>
              {index > 0 && ' '}
              {part}
            </React.Fragment>
          );
        }

        return (
          <React.Fragment key={key}>
            {index > 0 && ' '}
            {prefix}
            <span className="relative inline-block group cursor-help underline decoration-dotted decoration-indigo-400">
              {base}
              <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                {translation}
              </span>
            </span>
            {suffix}
          </React.Fragment>
        );
      })}
    </>
  );
}

