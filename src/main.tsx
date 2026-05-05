import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Initialize Eruda for mobile debugging
if (import.meta.env.DEV || window.location.search.includes('debug=true')) {
  import('eruda').then(({ default: eruda }) => eruda.init());
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
