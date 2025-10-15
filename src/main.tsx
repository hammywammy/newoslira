// src/main.tsx
/**
 * @file Application Entry Point
 * @description Fetches config from backend, then starts React
 */

console.log('🚀 main.tsx: FILE EXECUTING');

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { initializeConfig, validateConfig } from '@/core/config/env';
import '@/styles/index.css';

console.log('📦 main.tsx: Imports loaded');

// =============================================================================
// ERROR SCREEN
// =============================================================================

function showErrorScreen(error: Error) {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    document.body.innerHTML = '<div style="padding: 2rem; text-align: center;">Fatal Error: Root element not found</div>';
    return;
  }
  
  rootElement.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 2rem;
    ">
      <div style="
        max-width: 500px;
        width: 100%;
        padding: 2.5rem;
        background: white;
        border-radius: 1rem;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      ">
        <div style="
          width: 64px;
          height: 64px;
          margin: 0 auto 1.5rem;
          background: linear-gradient(135deg, #f87171 0%, #dc2626 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
        ">
          ⚠️
        </div>
        
        <h1 style="
          color: #111827;
          font-size: 1.5rem;
          font-weight: 700;
          text-align: center;
          margin: 0 0 0.75rem 0;
        ">
          Configuration Error
        </h1>
        
        <p style="
          color: #6b7280;
          font-size: 1rem;
          text-align: center;
          margin: 0 0 1.5rem 0;
          line-height: 1.5;
        ">
          Unable to load application configuration.
        </p>
        
        <div style="
          background: #f3f4f6;
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1.5rem;
        ">
          <p style="
            font-family: 'Courier New', monospace;
            font-size: 0.875rem;
            color: #ef4444;
            margin: 0;
            word-break: break-word;
          ">
            ${error.message}
          </p>
        </div>
        
        <div style="text-align: center;">
          <button 
            onclick="window.location.reload()"
            style="
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              padding: 0.75rem 2rem;
              border-radius: 0.5rem;
              font-weight: 600;
              cursor: pointer;
              font-size: 1rem;
            "
          >
            Retry
          </button>
        </div>
        
        <p style="
          margin-top: 1.5rem;
          text-align: center;
          font-size: 0.875rem;
          color: #9ca3af;
        ">
          If this persists, please contact support.
        </p>
      </div>
    </div>
  `;
}

// =============================================================================
// START THE APP (IIFE - ensures execution after bundling)
// =============================================================================

console.log('🎬 main.tsx: About to start app');

(async function() {
  console.log('▶️ main.tsx: App initialization EXECUTING');
  
  try {
    console.log('1️⃣ main.tsx: Initializing config...');
    await initializeConfig();
    console.log('2️⃣ main.tsx: Config initialized');
    
    console.log('3️⃣ main.tsx: Validating config...');
    validateConfig();
    console.log('4️⃣ main.tsx: Config validated');
    
    console.log('5️⃣ main.tsx: Getting root element...');
    const rootElement = document.getElementById('root');
    
    if (!rootElement) {
      console.error('❌ main.tsx: Root element not found!');
      throw new Error('Root element not found');
    }
    
    console.log('6️⃣ main.tsx: Root element found, creating React root...');
    const root = ReactDOM.createRoot(rootElement);
    
    console.log('7️⃣ main.tsx: Rendering App component...');
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    console.log('✅ main.tsx: App rendered successfully!');
    
  } catch (error) {
    console.error('💥 main.tsx: FATAL ERROR', error);
    showErrorScreen(error instanceof Error ? error : new Error(String(error)));
  }
})();

console.log('🏁 main.tsx: Script execution complete');
