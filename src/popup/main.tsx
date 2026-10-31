import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Popup root element #root is missing from index.html');

createRoot(rootElement).render(
  <StrictMode>
    <h1>NoChoice</h1>
  </StrictMode>,
);
