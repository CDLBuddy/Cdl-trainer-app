// src/main.jsx

import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// If you want to add global providers, auth context, etc., do it here
// Example: import { AuthProvider } from './contexts/AuthContext';

const root = document.getElementById('root');

createRoot(root).render(
  <React.StrictMode>
    {/* Place global providers here if needed */}
    {/* <AuthProvider> */}
    <App />
    {/* </AuthProvider> */}
  </React.StrictMode>
);
