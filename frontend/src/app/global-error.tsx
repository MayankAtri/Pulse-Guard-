"use client";

import React from "react";

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void _error;
  return (
    <html lang="en" className="dark">
      <body className="bg-[#050505] text-white flex items-center justify-center min-h-screen font-mono">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-red-500 uppercase tracking-widest">CRITICAL SYSTEM FAULT</h2>
          <p className="text-sm text-gray-400">A global exception occurred in the application layer.</p>
          <button
            onClick={() => reset()}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white font-bold uppercase tracking-widest text-xs hover:bg-emerald-700 transition-colors"
          >
            Reinitialize System
          </button>
        </div>
      </body>
    </html>
  );
}
