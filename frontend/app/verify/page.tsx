"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { getToken } from "@/lib/auth";
import { fetchUnverifiedReports, verifyReport, rejectReport, fetchVerifiedReports, hideReport } from "@/lib/api";

export default function VerifyPage() {
  const { user, isLoading } = useAuth();

  return (
    <main className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm z-20">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg overflow-hidden shrink-0">
          <img src="/Icon.jpg" alt="OpenPath Logo" className="w-full h-full object-cover" />
        </div>
        <div>
          <h1 className="font-bold text-gray-900 leading-none text-sm">
            OpenPath
          </h1>
          <p className="text-xs text-gray-500 leading-none mt-0.5">
            Ho Chi Minh City — Wheelchair Accessibility
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        ) : user?.role !== "admin" ? (
          /* Access Denied */
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
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
          /* Admin Dashboard */
          <Dashboard />
        )}
      </div>
    </main>
  );
}

function Dashboard() {
  const [activeTab, setActiveTab] = useState<"pending" | "verified">("pending");
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = async (tab: "pending" | "verified") => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) throw new Error("No token found");
      const data = tab === "pending" ? await fetchUnverifiedReports(token) : await fetchVerifiedReports(token);
      setReports(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports(activeTab);
  }, [activeTab]);

  const handleVerify = async (id: number) => {
    try {
      const token = getToken();
      if (!token) return;
      await verifyReport(id, token);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert("Failed to verify report");
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm("Are you sure you want to reject and delete this report?")) return;
    try {
      const token = getToken();
      if (!token) return;
      await rejectReport(id, token);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert("Failed to reject report");
    }
  };

  const handleHide = async (id: number) => {
    if (!confirm("Are you sure you want to hide this verified report?")) return;
    try {
      const token = getToken();
      if (!token) return;
      await hideReport(id, token);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert("Failed to hide report");
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto w-full space-y-4 pb-24">
      <div className="flex bg-gray-200 rounded-xl p-1 mb-4">
        <button
          onClick={() => setActiveTab("pending")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === "pending"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setActiveTab("verified")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === "verified"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Verified
        </button>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-gray-900">
          {activeTab === "pending" ? "Unverified Reports" : "Verified Reports"}
        </h2>
        <span className="text-sm text-gray-500">{reports.length} {activeTab === "pending" ? "pending" : "verified"}</span>
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => loadReports(activeTab)} className="text-blue-500 hover:underline">Retry</button>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="font-medium text-gray-900">All caught up!</p>
          <p className="text-sm text-gray-500 mt-1">
            {activeTab === "pending" ? "No pending reports to verify." : "No verified reports found."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
              {report.photo_url ? (
                <div className="aspect-video w-full bg-gray-100 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={report.photo_url} alt="Report photo" className="absolute inset-0 w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-video w-full bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">No photo provided</span>
                </div>
              )}
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full capitalize">
                    {report.category.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(report.last_updated || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 flex-1 mb-4">
                  {report.description || <span className="italic text-gray-400">No description provided</span>}
                </p>
                <div className="text-xs text-gray-500 mb-4 bg-gray-50 p-2 rounded-lg break-all">
                  Coordinates: {report.lat.toFixed(6)}, {report.lng.toFixed(6)}
                </div>
                <div className="flex gap-2 mt-auto">
                  {activeTab === "pending" ? (
                    <>
                      <button
                        onClick={() => handleReject(report.id)}
                        className="flex-1 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleVerify(report.id)}
                        className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 shadow-sm transition-colors"
                      >
                        Approve
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleHide(report.id)}
                        className="flex-1 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors"
                      >
                        Hide Report
                      </button>
                      <button
                        onClick={() => handleReject(report.id)}
                        className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 shadow-sm transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
