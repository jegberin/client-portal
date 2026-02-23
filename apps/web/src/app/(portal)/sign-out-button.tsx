"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function SignOutButton() {
  const handleSignOut = async () => {
    await fetch(`${API_URL}/api/auth/sign-out`, {
      method: "POST",
      credentials: "include",
    });
    window.location.href = "/login";
  };

  return (
    <button
      onClick={handleSignOut}
      className="px-3 py-1.5 rounded-lg hover:bg-[var(--muted)] text-sm text-[var(--muted-foreground)]"
    >
      Sign Out
    </button>
  );
}
