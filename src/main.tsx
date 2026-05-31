import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import 'katex/dist/katex.min.css';

// Defensive mock to protect against external onboarding/tour-guide script crashes (e.g. onboarding.js looking for editor.getImageNode)
if (typeof window !== 'undefined') {
  const mockEditor = {
    getImageNode: () => {
      console.log('[DEFENSIVE MOCK] editor.getImageNode called safely.');
      return null;
    },
    getEditorState: () => ({
      read: (cb: any) => cb(),
    }),
    getNodes: () => [],
    getRoot: () => null,
  };

  // Define global 'editor' variable safely with property definition
  if (!(window as any).editor) {
    (window as any).editor = mockEditor;
  }

  // Backup getter/setter to prevent other scripts from overwriting it with undefined or crashing if they lookup a bare 'editor' word
  try {
    Object.defineProperty(window, 'editor', {
      get() {
        return (window as any)._editor || mockEditor;
      },
      set(val) {
        (window as any)._editor = val;
      },
      configurable: true,
    });
  } catch (e) {
    console.warn('[DEFENSIVE MOCK] Could not defineProperty for window.editor, falling back to direct assignment.', e);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
