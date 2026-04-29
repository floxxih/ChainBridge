"use client";

import React from "react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="animate-pulse">
          <svg
            className="mx-auto h-24 w-24 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Offline</h1>
        <p className="text-lg text-gray-400">
          It looks like you've lost your internet connection. ChainBridge requires an active
          connection to interact with the blockchain.
        </p>
        <div className="flex flex-col space-y-4">
          <button
            onClick={() => window.location.reload()}
            className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-gray-900 bg-white hover:bg-gray-100 transition-colors duration-200"
          >
            Retry Connection
          </button>
          <Link
            href="/"
            className="w-full inline-flex justify-center items-center px-6 py-3 border border-gray-700 text-base font-medium rounded-md text-white bg-transparent hover:bg-gray-800 transition-colors duration-200"
          >
            Return Home
          </Link>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800">
          <p className="text-sm text-gray-500">
            ChainBridge will automatically reconnect once your network is stable.
          </p>
        </div>
      </div>
    </div>
  );
}
