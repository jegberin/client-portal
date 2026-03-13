"use client";

import { useState } from "react";
import Link from "next/link";
import { setActiveOrgAndRedirect } from "@/lib/api";
import { track } from "@/lib/track";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Sign in
      const res = await fetch(`${API_URL}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Invalid credentials");
      }

      await res.json();

      // 2. Set active org and redirect by role
      setRedirecting(true);
      window.location.href = await setActiveOrgAndRedirect("/portal/projects");
    } catch (err) {
      track("login_failed");
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  };

  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[var(--muted-foreground)]">Signing you in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Sign in to Crettyard Digital</h1>
            <p className="text-[var(--muted-foreground)] mt-2">
              Enter your credentials to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[var(--primary)] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>

      <footer className="py-6 px-4 border-t border-[var(--border)]">
        <div className="max-w-sm mx-auto text-center space-y-2">
          <p className="text-xs text-[var(--muted-foreground)]">
            &copy; 2026 Crettyard Digital. All rights reserved.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs">
            <a
              href="https://digital.crettyard.com/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
            >
              Privacy Policy
            </a>
            <span className="text-[var(--border)]">·</span>
            <a
              href="https://digital.crettyard.com/terms-and-conditions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
            >
              Terms &amp; Conditions
            </a>
            <span className="text-[var(--border)]">·</span>
            <a
              href="https://digital.crettyard.com/cookie-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
            >
              Cookie Policy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
