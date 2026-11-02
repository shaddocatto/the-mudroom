import { useMemo, useState } from 'react';
import { CloseIcon } from '../icons';
import { FAITH_INTEREST } from '../lib/constants';

// "Quiet Moment" — see design doc "Faith integration". Three tiers:
//  - no Faith & Spirituality interest: plain warmth, no attribution.
//  - that interest, no stated tradition (or one we don't confidently have
//    content for): tradition-neutral spiritual language, still no citation.
//  - that interest + a tradition containing "christ" in their own words:
//    an actual, well-known Bible verse with citation.
// Deliberately not inventing quotations from other traditions' scripture —
// easy to get wrong or render disrespectfully; those stay in the neutral
// tier until this is built out with real care per tradition.
const WARMTH = [
  "You don't have to have it figured out to belong here.",
  "Showing up today, as you are, is already enough.",
  'Slow is still moving. There’s no clock on any of this.',
  'The people worth knowing are worth the wait.',
];

const NEUTRAL_SPIRITUAL = [
  'Rest is not a reward you have to earn first.',
  'Being known is a kind of grace — give it time.',
  'Gratitude for one small thing today is enough of a prayer.',
  'You are allowed to take up space here, exactly as you are.',
];

const CHRISTIAN = [
  { text: 'Come to me, all who are weary, and I will give you rest.', source: 'Matthew 11:28' },
  { text: 'The Lord is close to the brokenhearted.', source: 'Psalm 34:18' },
  { text: 'Be still, and know that I am God.', source: 'Psalm 46:10' },
  { text: 'Love one another as I have loved you.', source: 'John 13:34' },
];

function pickOfTheDay(list) {
  const day = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (const ch of day) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return list[hash % list.length];
}

function dismissKey() {
  return `mudroom.reflection.dismissed.${new Date().toISOString().slice(0, 10)}`;
}

export default function ReflectionCard({ profile }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(dismissKey()) === '1';
    } catch {
      return false;
    }
  });

  const hasFaithInterest = profile?.interests?.includes(FAITH_INTEREST);
  const tradition = (profile?.faith_tradition || '').toLowerCase();

  const content = useMemo(() => {
    if (!hasFaithInterest) {
      return { text: pickOfTheDay(WARMTH), source: null };
    }
    if (tradition.includes('christ')) {
      return pickOfTheDay(CHRISTIAN);
    }
    return { text: pickOfTheDay(NEUTRAL_SPIRITUAL), source: null };
  }, [hasFaithInterest, tradition]);

  if (dismissed) return null;

  function dismiss() {
    try {
      localStorage.setItem(dismissKey(), '1');
    } catch {
      /* ignore — per-viewer convenience only */
    }
    setDismissed(true);
  }

  return (
    <div className="reflection-card">
      <button className="reflection-card__dismiss" onClick={dismiss} aria-label="Dismiss">
        <CloseIcon width={16} height={16} />
      </button>
      <span className="reflection-card__eyebrow">A quiet moment</span>
      <p>
        {content.text}
        {content.source && <span className="reflection-card__source">{content.source}</span>}
      </p>
    </div>
  );
}
