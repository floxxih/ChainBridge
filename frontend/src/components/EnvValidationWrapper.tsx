"use client";

import { useEffect, useState } from "react";
import { EnvValidationError, validateEnv } from "@/lib/envValidation";

export function EnvValidationWrapper({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<EnvValidationError | null>(null);

  useEffect(() => {
    try {
      validateEnv();
    } catch (err) {
      if (err instanceof EnvValidationError) {
        setError(err);
      } else {
        throw err;
      }
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4v2m0 4v2M9 5h6"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
              Configuration Error
            </h1>
            <p className="text-gray-600 text-center mb-6">
              The application cannot start due to missing or invalid environment variables.
            </p>

            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <h2 className="text-sm font-semibold text-red-900 mb-3">Issues Found:</h2>
              <div className="space-y-2">
                {error.missingVars.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-800 mb-1">
                      Missing Required Variables:
                    </p>
                    <ul className="text-xs text-red-700 space-y-1 ml-4">
                      {error.missingVars.map((v) => (
                        <li key={v}>- {v}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {Object.keys(error.invalidVars).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-800 mb-1">Invalid Values:</p>
                    <ul className="text-xs text-red-700 space-y-1 ml-4">
                      {Object.entries(error.invalidVars).map(([k, v]) => (
                        <li key={k}>
                          - {k}: {v}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">What to do:</h3>
              <ol className="text-xs text-blue-700 space-y-2 list-decimal ml-4">
                <li>
                  Copy <code className="bg-white px-1 rounded">.env.example</code> to{" "}
                  <code className="bg-white px-1 rounded">.env.local</code>
                </li>
                <li>Fill in all required environment variables</li>
                <li>Ensure URLs are valid and networks match your setup</li>
                <li>Restart the development server</li>
              </ol>
            </div>

            <details className="text-xs">
              <summary className="text-blue-600 hover:text-blue-800 cursor-pointer font-medium">
                Full error details
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-gray-700 overflow-auto text-[10px] max-h-48">
                {error.message}
              </pre>
            </details>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
