"use client";

import React from 'react';

interface ErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function ErrorFallback({ error, reset }: ErrorFallbackProps) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-4 text-center">
      <div className="bg-red-50 text-red-600 rounded-full w-16 h-16 flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong!</h2>
      <p className="text-gray-600 mb-6 max-w-md">
        We apologize for the inconvenience. An unexpected error has occurred.
      </p>
      
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-100 p-4 rounded-md mb-6 w-full max-w-2xl overflow-auto text-left">
          <p className="font-mono text-sm text-red-600 font-semibold mb-2">{error.message}</p>
          <pre className="font-mono text-xs text-gray-700 whitespace-pre-wrap">{error.stack}</pre>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="px-6 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
