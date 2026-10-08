import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { DesktopDock } from './components/DesktopDock';
import { WarRoomStandalone } from './components/WarRoomStandalone';
import './index.css';

const isDock = window.location.hash === '#dock' || window.location.search.includes('dock=true');
const isWarRoom = window.location.hash === '#war-room' || window.location.hash === '#nexus-command' || window.location.search.includes('war-room=true');

if (isDock) {
  document.documentElement.style.background = 'transparent';
  document.body.style.background = 'transparent';
  document.body.classList.remove('bg-dark-950');
  document.body.classList.add('bg-transparent');
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.style.background = 'transparent';
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isDock ? <DesktopDock /> : isWarRoom ? <WarRoomStandalone /> : <App />}
  </React.StrictMode>
);
