import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { initTts } from './lib/tts.ts';
import { registerPwa } from './pwa.ts';
import './styles/global.css';

initTts();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerPwa();
