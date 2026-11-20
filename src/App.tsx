import { useEffect, type ComponentType } from 'react';
import { BackupReminder, UpdateBanner } from './components/Banners';
import { TabNav } from './components/TabNav';
import { ChartsPage, isFocusRoute } from './pages/ChartsPage';
import { DesignerPage, NotFoundPage, PortfolioPage, StitchesPage } from './pages/Placeholders';
import { SettingsPage } from './pages/SettingsPage';
import { parseHash, startTab, tabHref, useHash, type TabId } from './router';
import { readDevice, writeDevice } from './storage/device';

const PAGES: Record<TabId, ComponentType<{ rest: string[] }>> = {
  charts: ChartsPage,
  stitches: StitchesPage,
  designer: DesignerPage,
  portfolio: PortfolioPage,
  settings: SettingsPage,
};

export function App() {
  const hash = useHash();
  const route = parseHash(hash) ?? { tab: startTab(readDevice('last-tab')), rest: [] };
  const rest = route.tab ? route.rest : [];

  useEffect(() => {
    // An empty address opens the start tab; replace it so Back doesn't land on a blank page.
    if (!parseHash(hash) && route.tab) window.location.replace(tabHref(route.tab));
  }, [hash, route.tab]);

  useEffect(() => {
    if (route.tab && route.tab !== 'settings') writeDevice('last-tab', route.tab);
  }, [route.tab]);

  const Current = route.tab ? PAGES[route.tab] : NotFoundPage;
  const focus = isFocusRoute(route.tab, rest);

  return (
    <div className={`app${focus ? ' focus' : ''}`}>
      <TabNav current={route.tab} />
      <main className="content">
        <UpdateBanner />
        {!focus && <BackupReminder />}
        <Current key={route.tab ?? 'not-found'} rest={rest} />
      </main>
    </div>
  );
}
