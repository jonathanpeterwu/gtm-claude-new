'use client';

import './globals.css';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';

function ThemeInitializer() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem('superuser-theme');
      if (stored) {
        const parsed = JSON.parse(stored);
        const theme = parsed?.state?.theme || 'dark';
        document.documentElement.classList.toggle('dark', theme === 'dark');
        document.documentElement.classList.toggle('light', theme === 'light');
      }
    } catch {}
  }, []);
  return null;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <title>Superuser — AI-Powered Gmail</title>
        <meta name="description" content="Power through your inbox with AI" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg-primary text-text-primary antialiased">
        <SessionProvider>
          <ThemeInitializer />
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                fontSize: '13px',
              },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  );
}
