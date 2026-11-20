import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { startPwa } from './pwa';
import { requestPersistentStorage } from './storage/persist';
import './styles.css';

startPwa();
// Ask the browser to protect saved data from automatic clean-up. Chrome decides silently.
void requestPersistentStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
