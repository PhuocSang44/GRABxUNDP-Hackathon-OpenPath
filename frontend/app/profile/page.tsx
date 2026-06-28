"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthContext";
import { User, LogOut, Shield } from "lucide-react";

type AuthTab = "login" | "register";

export default function ProfilePage() {
  const { user, isLoading, login, register, logout } = useAuth();
  const [tab, setTab] = useState<AuthTab>("login");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (tab === "login") {
        await login(username, password);
      } else {
        await register(username, name, password);
      }
      setUsername("");
      setName("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

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
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-sm mx-auto px-4 py-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : user ? (
            /* ── Logged In ── */
            <div className="space-y-6">
              {/* Avatar + Info */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 px-6 py-8 text-center">
                  <div className="w-20 h-20 mx-auto bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {user.name || user.username}
                  </h2>
                  <div className="mt-2 inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                    <Shield className="w-3.5 h-3.5 text-white" />
                    <span className="text-xs font-medium text-white capitalize">
                      {user.role}
                    </span>
                  </div>
                </div>
                <div className="px-6 py-4 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Full Name</span>
                    <span className="font-medium text-gray-900">
                      {user.name || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Username</span>
                    <span className="font-medium text-gray-900">
                      {user.username}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Role</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium capitalize">
                      {user.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 rounded-xl py-3 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all text-sm shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          ) : (
            /* ── Not Logged In ── */
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-green-50 rounded-2xl flex items-center justify-center mb-4">
                  <User className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Welcome Back
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Sign in to report accessibility issues
                </p>
              </div>

              {/* Tab Switch */}
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => {
                    setTab("login");
                    setError(null);
                  }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                    tab === "login"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setTab("register");
                    setError(null);
                  }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                    tab === "register"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {tab === "register" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoComplete="name"
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                      placeholder="Enter your full name"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                    placeholder="Enter your username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={
                      tab === "login" ? "current-password" : "new-password"
                    }
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                    placeholder="Enter your password"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-green-500 hover:bg-green-600 text-white rounded-xl py-3 font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-green-500/20"
                >
                  {submitting
                    ? "Please wait..."
                    : tab === "login"
                    ? "Sign In"
                    : "Create Account"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
