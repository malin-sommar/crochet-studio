import { useId, type ReactNode } from 'react';
import type { TabId } from '../router';

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const ICONS: Record<TabId, ReactNode> = {
  // A chart grid with one filled square
  charts: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
      <path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17" />
      <rect x="9.2" y="9.2" width="5.6" height="5.6" fill="currentColor" stroke="none" />
    </>
  ),
  // Three chain loops
  stitches: (
    <>
      <ellipse cx="6.5" cy="12" rx="4" ry="2.8" />
      <ellipse cx="12" cy="12" rx="4" ry="2.8" />
      <ellipse cx="17.5" cy="12" rx="4" ry="2.8" />
    </>
  ),
  // A striped scarf with fringe
  designer: (
    <>
      <rect x="7" y="2.5" width="10" height="15" rx="1.5" />
      <path d="M7 7.5h10M7 12.5h10M8.8 17.5v4M12 17.5v4M15.2 17.5v4" />
    </>
  ),
  // A photo
  portfolio: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.8" />
      <path d="M3.5 17.5l5-5 4 4 3-3 5 5" />
    </>
  ),
  // Sliders
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2.2" />
      <circle cx="9" cy="17" r="2.2" />
    </>
  ),
};

export function TabIcon({ tab }: { tab: TabId }) {
  return <Svg>{ICONS[tab]}</Svg>;
}

/** The app's mark: a ball of yarn. Same drawing as public/icon.svg. */
export function YarnBall({ size = 32 }: { size?: number }) {
  const clip = useId();
  return (
    <svg viewBox="4 4 58 54" width={size} height={size} aria-hidden="true">
      <clipPath id={clip}>
        <circle cx="30" cy="30" r="21" />
      </clipPath>
      <path d="M44 45c4 5 9 8 14 7" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="30" cy="30" r="21" fill="var(--accent)" />
      <g clipPath={`url(#${clip})`} fill="none" stroke="var(--surface)" strokeWidth="2.4">
        <circle cx="58" cy="58" r="24" />
        <circle cx="58" cy="58" r="32" />
        <circle cx="58" cy="58" r="40" />
        <circle cx="2" cy="60" r="27" />
        <circle cx="2" cy="60" r="36" />
      </g>
    </svg>
  );
}
