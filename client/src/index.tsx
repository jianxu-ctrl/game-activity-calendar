import React from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';

import RoutesComponent from './app.tsx';
import './index.css';
import { Toaster } from '@client/src/components/ui/sonner';

const CLIENT_BASE_PATH = process.env.CLIENT_BASE_PATH || '/';

const MainApp = () => {
  return (
    <BrowserRouter basename={CLIENT_BASE_PATH}>
      <ErrorBoundary
        fallbackRender={({ error, resetErrorBoundary }) => (
          <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-zinc-100">
            <div className="max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg">
              <h1 className="text-lg font-semibold">页面出错了</h1>
              <p className="mt-2 text-sm text-zinc-400">
                {error instanceof Error ? error.message : '请稍后再试'}
              </p>
              <button
                className="mt-4 rounded-lg bg-orange-800 px-4 py-2 text-sm font-medium text-orange-50 hover:bg-orange-700"
                onClick={resetErrorBoundary}
              >
                重试
              </button>
            </div>
          </div>
        )}
      >
        <RoutesComponent />
        {createPortal(<Toaster />, document.body)}
      </ErrorBoundary>
    </BrowserRouter>
  );
};

createRoot(document.getElementById('root')!).render(<MainApp />);
