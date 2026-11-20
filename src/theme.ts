import { useEffect, useState } from 'react';
import { readDevice, writeDevice } from './storage/device';

/** The theme is chosen per device (dark on the phone at night, light on the computer, ...). */
export type ThemeChoice = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

export const THEME_LABELS: Record<ThemeChoice, string> = {
  system: 'Automatic',
  light: 'Light',
  dark: 'Dark',
};

/** Must match --bg in styles.css and the start-up script in index.html. */
const BAR_COLORS: Record<Theme, string> = { light: '#faf6ef', dark: '#1b1719' };

export function parseThemeChoice(value: string | null): ThemeChoice {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function resolveTheme(choice: ThemeChoice, systemPrefersDark: boolean): Theme {
  if (choice === 'system') return systemPrefersDark ? 'dark' : 'light';
  return choice;
}

const darkQuery = () => window.matchMedia?.('(prefers-color-scheme: dark)');

export function applyTheme(choice: ThemeChoice): void {
  const theme = resolveTheme(choice, darkQuery()?.matches ?? false);
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR_COLORS[theme]);
}

export function useThemeChoice(): [ThemeChoice, (c: ThemeChoice) => void] {
  const [choice, setChoice] = useState<ThemeChoice>(() => parseThemeChoice(readDevice('theme')));

  useEffect(() => {
    applyTheme(choice);
    if (choice !== 'system') return;
    const q = darkQuery();
    const follow = () => applyTheme('system');
    q?.addEventListener('change', follow);
    return () => q?.removeEventListener('change', follow);
  }, [choice]);

  const save = (c: ThemeChoice) => {
    writeDevice('theme', c === 'system' ? null : c);
    setChoice(c);
  };
  return [choice, save];
}
