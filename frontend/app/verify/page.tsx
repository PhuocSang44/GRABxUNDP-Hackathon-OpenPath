"use client";

import { useAuth } from "@/components/AuthContext";
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";

export default function VerifyPage() {
  const { user, isLoading } = useAuth();

  return (
    <main className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm z-20">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500 text-white font-bold text-sm">
          A
        </div>
        <div>
          <h1 className="font-bold text-gray-900 leading-none text-sm">
            AccessibleMap
          </h1>
          <p className="text-xs text-gray-500 leading-none mt-0.5">
            Ho Chi Minh City — Wheelchair Accessibility
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        ) : user?.role !== "admin" ? (
          /* Access Denied */
          <div className="text-center px-6">
            <div className="w-16 h-16 mx-auto bg-red-50 rounded-2xl flex items-center justify-center mb-4">
              <ShieldAlert className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-sm text-gray-500 max-w-xs">
              This page is restricted to administrators. Please sign in with an
              admin account to verify reports.
            </p>
          </div>
        ) : (
          /* Admin Dashboard Placeholder */
          <div className="text-center px-6">
            <div className="w-16 h-16 mx-auto bg-green-50 rounded-2xl flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Verify Reports
            </h2>
            <p className="text-sm text-gray-500 max-w-xs">
              Report verification dashboard coming soon. You&apos;ll be able to
              review and approve community-submitted accessibility reports here.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 bg-green-50 text-green-700 rounded-full px-4 py-2 text-xs font-medium">
              <ShieldCheck className="w-4 h-4" />
              Signed in as admin
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
