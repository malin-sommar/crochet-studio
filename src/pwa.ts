import { registerSW } from 'virtual:pwa-register';
import { signal } from './lib/signal';
import { requestPersistentStorage } from './storage/persist';

/**
 * Installing and updating the app.
 *
 * - A service worker keeps a copy of the app so it opens offline.
 * - When a new version has been downloaded, `updateReady` turns on and the app shows a
 *   banner. It only switches when you tap it, never in the middle of a row.
 * - Chrome offers installing the app; we keep that offer so Settings can show an Install button.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const updateReady = signal(false);
export const canInstall = signal(false);

let update: ((reload?: boolean) => Promise<void>) | null = null;
let installOffer: BeforeInstallPromptEvent | null = null;

export function startPwa(): void {
  update = registerSW({
    onNeedRefresh: () => updateReady.set(true),
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installOffer = e as BeforeInstallPromptEvent;
    canInstall.set(true);
  });
  window.addEventListener('appinstalled', () => {
    installOffer = null;
    canInstall.set(false);
    void requestPersistentStorage();
  });
}

export async function applyUpdate(): Promise<void> {
  if (update) await update(true);
  else window.location.reload();
}

export async function promptInstall(): Promise<boolean> {
  if (!installOffer) return false;
  await installOffer.prompt();
  const { outcome } = await installOffer.userChoice;
  installOffer = null;
  canInstall.set(false);
  return outcome === 'accepted';
}

export function isInstalled(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches ?? false;
}
