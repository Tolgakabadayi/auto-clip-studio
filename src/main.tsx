import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { DesktopDock } from './components/DesktopDock';
import './index.css';

const isDock = window.location.hash === '#dock' || window.location.search.includes('dock=true');

if (isDock) {
  document.documentElement.style.background = 'transparent';
  document.body.style.background = 'transparent';
  document.body.classList.remove('bg-dark-950');
  document.body.classList.add('bg-transparent');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isDock ? <DesktopDock /> : <App />}
  </React.StrictMode>
);
