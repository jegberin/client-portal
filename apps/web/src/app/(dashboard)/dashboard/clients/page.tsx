"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Invitation {
  id: string;
  email: string;
  status: string;
  expiresAt: string;
  inviteLink: string;
}

interface ClientMember {
  id: string;
  userId: string;
  role: string;
  user: { id: string; name: string; email: string };
}

export default function ClientsPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [clients, setClients] = useState<ClientMember[]>([]);
  const [copied, setCopied] = useState("");

  const loadData = () => {
    apiFetch<Invitation[]>("/clients/invitations")
      .then(setInvitations)
      .catch(console.error);
    apiFetch<ClientMember[]>("/clients")
      .then(setClients)
      .catch(console.error);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInviteLink("");
    try {
      await apiFetch("/auth/organization/invite-member", {
        method: "POST",
        body: JSON.stringify({ email, role: "member" }),
      });
      setEmail("");
      loadData();

      // Fetch the updated invitations to get the link for the new one
      const updated = await apiFetch<Invitation[]>("/clients/invitations");
      setInvitations(updated);
      const newest = updated.find((inv) => inv.email === email.toLowerCase() || inv.email === email);
      if (newest) {
        setInviteLink(newest.inviteLink);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite");
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(link);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Clients</h1>

      {/* Invite Form */}
      <div className="max-w-lg">
        <h2 className="text-sm font-medium mb-3">Invite a Client</h2>
        <form onSubmit={handleInvite} className="space-y-3">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              required
              className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium whitespace-nowrap"
            >
              Invite
            </button>
          </div>
        </form>

        {inviteLink && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-medium mb-2">
              Invitation created! Share this link with your client:
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={inviteLink}
                className="flex-1 px-2 py-1 text-sm bg-white border border-green-300 rounded font-mono"
              />
              <button
                onClick={() => copyLink(inviteLink)}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                {copied === inviteLink ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active Clients */}
      {clients.length > 0 && (
        <div>
          <h2 className="text-sm font-medium mb-3">Active Clients</h2>
          <div className="space-y-2">
            {clients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-3 border border-[var(--border)] rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium">{client.user.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {client.user.email}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 bg-[var(--muted)] rounded-full">
                  {client.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div>
          <h2 className="text-sm font-medium mb-3">Pending Invitations</h2>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3 border border-[var(--border)] rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium">{inv.email}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Expires{" "}
                    {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => copyLink(inv.inviteLink)}
                  className="text-sm text-[var(--primary)] hover:underline"
                >
                  {copied === inv.inviteLink ? "Copied!" : "Copy Link"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
