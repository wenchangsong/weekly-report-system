import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Enforce one account per browser: if another tab logs in as a different user, reload this tab
window.addEventListener('storage', (e) => {
  if (e.key === 'token') {
    const oldUid = localStorage.getItem('uid');
    // Token changed externally, reload to pick up the new user
    if (!e.newValue) {
      // Token was removed (logout from another tab)
      window.location.reload();
    } else if (e.newValue !== e.oldValue) {
      // New login from another tab
      window.location.reload();
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
