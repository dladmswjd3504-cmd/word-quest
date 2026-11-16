import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { initSfx } from './lib/sfx.ts';
import { initTts } from './lib/tts.ts';
import { registerPwa } from './pwa.ts';
import './styles/global.css';

initTts();
initSfx();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerPwa();
