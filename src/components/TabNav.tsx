import { TABS, tabHref, type TabId } from '../router';
import { TabIcon, YarnBall } from './Icons';

/** Bottom tab bar on a phone, side bar on a wider screen. */
export function TabNav({ current }: { current: TabId | null }) {
  return (
    <nav className="tabnav" aria-label="Sections">
      <div className="brand">
        <YarnBall size={34} />
        <span>Crochet Studio</span>
      </div>
      <ul>
        {TABS.map((t) => (
          <li key={t.id}>
            <a href={tabHref(t.id)} aria-current={t.id === current ? 'page' : undefined}>
              <span className="tab-icon">
                <TabIcon tab={t.id} />
              </span>
              <span className="tab-label">{t.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
