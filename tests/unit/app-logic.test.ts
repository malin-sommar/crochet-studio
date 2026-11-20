import { describe, expect, test } from 'vitest';
import { backupIsDue } from '../../src/backupActions';
import { daysBetween, formatAgo } from '../../src/lib/format';
import { parseHash, startTab, tabHref } from '../../src/router';
import { parseThemeChoice, resolveTheme } from '../../src/theme';

describe('addresses', () => {
  test('an empty address means "open the start tab"', () => {
    expect(parseHash('')).toBeNull();
    expect(parseHash('#')).toBeNull();
    expect(parseHash('#/')).toBeNull();
  });

  test('reads the tab and anything after it', () => {
    expect(parseHash('#/charts')).toEqual({ tab: 'charts', rest: [] });
    expect(parseHash('#/stitches/sc/')).toEqual({ tab: 'stitches', rest: ['sc'] });
    expect(parseHash('#/portfolio/a%20b')).toEqual({ tab: 'portfolio', rest: ['a b'] });
  });

  test('an unknown tab is "not found"', () => {
    expect(parseHash('#/nope/x')).toEqual({ tab: null, path: 'nope/x' });
  });

  test('a broken escape does not crash', () => {
    expect(parseHash('#/charts/%E0%A4%A')).toEqual({ tab: 'charts', rest: ['%E0%A4%A'] });
  });

  test('links round-trip', () => {
    expect(tabHref('stitches', 'magic ring')).toBe('#/stitches/magic%20ring');
    expect(parseHash(tabHref('stitches', 'magic ring'))).toEqual({ tab: 'stitches', rest: ['magic ring'] });
  });

  test('the start tab is the last main tab used, never Settings', () => {
    expect(startTab(null)).toBe('charts');
    expect(startTab('designer')).toBe('designer');
    expect(startTab('settings')).toBe('charts');
    expect(startTab('garbage')).toBe('charts');
  });
});

describe('theme', () => {
  test('automatic follows the device', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  test('a chosen theme ignores the device', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  test('anything unexpected in storage means automatic', () => {
    expect(parseThemeChoice(null)).toBe('system');
    expect(parseThemeChoice('purple')).toBe('system');
    expect(parseThemeChoice('dark')).toBe('dark');
  });
});

describe('backup reminder', () => {
  const day = 24 * 60 * 60 * 1000;
  const now = new Date(2026, 10, 20, 12).getTime();

  test('nothing to back up, no reminder', () => {
    expect(backupIsDue({ count: 0, oldestCreatedAt: null }, null, now)).toBe(false);
  });

  test('never backed up: waits until the work is 2 days old', () => {
    expect(backupIsDue({ count: 1, oldestCreatedAt: now - day }, null, now)).toBe(false);
    expect(backupIsDue({ count: 1, oldestCreatedAt: now - 2 * day }, null, now)).toBe(true);
  });

  test('backed up before: reminds after 14 days', () => {
    expect(backupIsDue({ count: 3, oldestCreatedAt: 0 }, now - 13 * day, now)).toBe(false);
    expect(backupIsDue({ count: 3, oldestCreatedAt: 0 }, now - 14 * day, now)).toBe(true);
  });
});

describe('dates', () => {
  const now = new Date(2026, 10, 20, 9, 0).getTime();

  test('says today, yesterday, or how many days ago', () => {
    expect(formatAgo(new Date(2026, 10, 20, 0, 5).getTime(), now)).toBe('today');
    expect(formatAgo(new Date(2026, 10, 19, 23, 59).getTime(), now)).toBe('yesterday');
    expect(formatAgo(new Date(2026, 10, 10).getTime(), now)).toBe('10 days ago');
    expect(formatAgo(new Date(2026, 0, 15).getTime(), now)).toBe('on 15 Jan 2026');
  });

  test('counts calendar days', () => {
    expect(daysBetween(new Date(2026, 10, 19, 23).getTime(), new Date(2026, 10, 20, 1).getTime())).toBe(1);
  });
});
