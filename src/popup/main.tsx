import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PopupPage } from './components/pages/PopupPage';
import './popup.scss';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Popup root element #root is missing from index.html');

createRoot(rootElement).render(
  <StrictMode>
    <PopupPage />
  </StrictMode>,
);
