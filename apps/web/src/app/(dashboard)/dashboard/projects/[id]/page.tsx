"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { formatBytes, formatRelativeTime } from "@/lib/utils";

interface FileRecord {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  clients?: { userId: string }[];
  files: FileRecord[];
}

interface ProjectStatus {
  id: string;
  name: string;
  slug: string;
  color: string;
  order: number;
}

interface ProjectUpdateRecord {
  id: string;
  content: string;
  imageUrl?: string;
  hasImage: boolean;
  author: { id: string; name: string };
  createdAt: string;
}

interface ClientMember {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string };
}

function ClientAssignmentSection({
  clients,
  assignedIds,
  onToggle,
  onRemove,
}: {
  clients: ClientMember[];
  assignedIds: Set<string>;
  onToggle: (userId: string) => void;
  onRemove: (userId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const query = search.toLowerCase();
  const filtered = clients.filter(
    (c) =>
      c.user.name.toLowerCase().includes(query) ||
      c.user.email.toLowerCase().includes(query),
  );

  const assignedClients = clients.filter((c) => assignedIds.has(c.userId));

  return (
    <div>
      <h2 className="text-sm font-medium mb-3">
        Assigned Clients{assignedIds.size > 0 && ` (${assignedIds.size})`}
      </h2>

      {clients.length > 0 ? (
        <div ref={containerRef} className="relative max-w-md">
          {/* Selected tags + search input */}
          <div
            className="flex flex-wrap gap-1.5 min-h-[42px] px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] cursor-text"
            onClick={() => {
              setOpen(true);
              inputRef.current?.focus();
            }}
          >
            {assignedClients.map((c) => (
              <span
                key={c.userId}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--muted)] rounded text-xs font-medium"
              >
                {c.user.name}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(c.userId);
                  }}
                  className="ml-0.5 hover:text-red-500"
                >
                  &times;
                </button>
              </span>
            ))}
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setOpen(true)}
              placeholder={assignedClients.length === 0 ? "Search clients..." : ""}
              className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-[var(--muted-foreground)]"
            />
          </div>

          {/* Dropdown */}
          {open && (
            <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto border border-[var(--border)] rounded-lg bg-[var(--background)] shadow-lg">
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-sm text-[var(--muted-foreground)]">
                  No clients found.
                </div>
              ) : (
                filtered.map((c) => {
                  const selected = assignedIds.has(c.userId);
                  return (
                    <button
                      key={c.userId}
                      type="button"
                      onClick={() => {
                        onToggle(c.userId);
                        setSearch("");
                        inputRef.current?.focus();
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 text-left text-sm hover:bg-[var(--muted)] transition-colors"
                    >
                      <span
                        className="flex items-center justify-center w-4 h-4 rounded border border-[var(--border)] text-xs shrink-0"
                        style={{
                          backgroundColor: selected ? "var(--primary)" : "transparent",
                          borderColor: selected ? "var(--primary)" : undefined,
                          color: selected ? "#fff" : "transparent",
                        }}
                      >
                        {selected ? "\u2713" : ""}
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{c.user.name}</div>
                        <div className="text-[var(--muted-foreground)] truncate">
                          {c.user.email}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-[var(--muted-foreground)]">
          No clients yet. Invite clients from the{" "}
          <a
            href="/dashboard/clients"
            className="text-[var(--primary)] hover:underline"
          >
            Clients page
          </a>
          .
        </p>
      )}

      {assignedIds.size > 0 && (
        <p className="text-xs text-[var(--muted-foreground)] mt-2">
          {assignedIds.size === 1
            ? "This client will"
            : "These clients will"}{" "}
          see this project in their portal.
        </p>
      )}
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [clients, setClients] = useState<ClientMember[]>([]);
  const [uploading, setUploading] = useState(false);
  const [updates, setUpdates] = useState<ProjectUpdateRecord[]>([]);
  const [newUpdateContent, setNewUpdateContent] = useState("");
  const [newUpdateImage, setNewUpdateImage] = useState<File | null>(null);
  const [postingUpdate, setPostingUpdate] = useState(false);
  const [showUpdates, setShowUpdates] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);

  const loadProject = useCallback(() => {
    apiFetch<Project>(`/projects/${id}`).then(setProject).catch(console.error);
  }, [id]);

  const loadUpdates = useCallback(() => {
    apiFetch<ProjectUpdateRecord[]>(`/updates/project/${id}`)
      .then(setUpdates)
      .catch(console.error);
  }, [id]);

  useEffect(() => {
    loadProject();
    loadUpdates();
    apiFetch<ProjectStatus[]>("/projects/statuses")
      .then(setStatuses)
      .catch(console.error);
    apiFetch<ClientMember[]>("/clients")
      .then(setClients)
      .catch(console.error);
  }, [loadProject, loadUpdates]);

  const handleStatusChange = async (status: string) => {
    await apiFetch(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    loadProject();
  };

  const handleClientToggle = async (userId: string) => {
    if (!project) return;
    const currentIds = (project.clients ?? []).map((c) => c.userId);
    const newIds = currentIds.includes(userId)
      ? currentIds.filter((cid) => cid !== userId)
      : [...currentIds, userId];
    await apiFetch(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify({ clientUserIds: newIds }),
    });
    loadProject();
  };

  const handleRemoveClient = async (userId: string) => {
    if (!project) return;
    const newIds = (project.clients ?? [])
      .map((c) => c.userId)
      .filter((cid) => cid !== userId);
    await apiFetch(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify({ clientUserIds: newIds }),
    });
    loadProject();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/files/upload?projectId=${id}`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        },
      );
      loadProject();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/files/${fileId}/download`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostUpdate = async () => {
    if (!newUpdateContent.trim()) return;
    setPostingUpdate(true);
    try {
      const formData = new FormData();
      formData.append("content", newUpdateContent);
      if (newUpdateImage) {
        formData.append("image", newUpdateImage);
      }
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/updates?projectId=${id}`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        },
      );
      setNewUpdateContent("");
      setNewUpdateImage(null);
      setShowComposeModal(false);
      loadUpdates();
    } catch (err) {
      console.error(err);
    } finally {
      setPostingUpdate(false);
    }
  };

  const handleDeleteUpdate = async (updateId: string) => {
    await apiFetch(`/updates/${updateId}`, { method: "DELETE" });
    loadUpdates();
  };

  const handleDeleteFile = async (fileId: string) => {
    await apiFetch(`/files/${fileId}`, { method: "DELETE" });
    loadProject();
  };

  if (!project) return <div>Loading...</div>;

  const assignedIds = new Set((project.clients ?? []).map((c) => c.userId));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{project.name}</h1>
        {project.description && (
          <p className="text-[var(--muted-foreground)] mt-1">
            {project.description}
          </p>
        )}
      </div>

      {/* Status Pipeline */}
      <div>
        <h2 className="text-sm font-medium mb-3">Status</h2>
        <div className="flex gap-2">
          {statuses.map((s) => (
            <button
              key={s.id}
              onClick={() => handleStatusChange(s.slug)}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                backgroundColor:
                  project.status === s.slug ? s.color : "var(--muted)",
                color:
                  project.status === s.slug ? "#fff" : "var(--foreground)",
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Client Assignment */}
      <ClientAssignmentSection
        clients={clients}
        assignedIds={assignedIds}
        onToggle={handleClientToggle}
        onRemove={handleRemoveClient}
      />

      {/* Updates */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">
            Updates{updates.length > 0 && ` (${updates.length})`}
          </h2>
          <button
            onClick={() => setShowUpdates(!showUpdates)}
            className="text-sm text-[var(--primary)] hover:underline"
          >
            {showUpdates ? "Hide" : "Show Updates"}
          </button>
        </div>

        {showUpdates && (
          <>
            <button
              onClick={() => setShowComposeModal(true)}
              className="mb-4 px-4 py-1.5 bg-[var(--primary)] text-white rounded-lg text-sm hover:opacity-90"
            >
              Add Update
            </button>

            {/* Compose modal */}
            {showComposeModal && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowComposeModal(false);
                    setNewUpdateContent("");
                    setNewUpdateImage(null);
                  }
                }}
              >
                <div className="bg-[var(--background)] rounded-xl shadow-lg w-full max-w-lg mx-4 p-6 space-y-4">
                  <h3 className="text-lg font-semibold">Post Update</h3>
                  <textarea
                    value={newUpdateContent}
                    onChange={(e) => setNewUpdateContent(e.target.value)}
                    placeholder="Write a status update..."
                    maxLength={5000}
                    rows={4}
                    autoFocus
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm resize-none outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm cursor-pointer hover:bg-[var(--muted)] transition-colors">
                      Attach Image
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={(e) => setNewUpdateImage(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    {newUpdateImage && (
                      <span className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
                        {newUpdateImage.name}
                        <button
                          type="button"
                          onClick={() => setNewUpdateImage(null)}
                          className="hover:text-red-500"
                        >
                          &times;
                        </button>
                      </span>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowComposeModal(false);
                        setNewUpdateContent("");
                        setNewUpdateImage(null);
                      }}
                      className="px-4 py-1.5 border border-[var(--border)] rounded-lg text-sm hover:bg-[var(--muted)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePostUpdate}
                      disabled={postingUpdate || !newUpdateContent.trim()}
                      className="px-4 py-1.5 bg-[var(--primary)] text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
                    >
                      {postingUpdate ? "Posting..." : "Post"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Updates feed */}
            <div className="space-y-3">
          {updates.map((update) => {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            return (
              <div
                key={update.id}
                className="border border-[var(--border)] rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{update.author.name}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {formatRelativeTime(update.createdAt)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteUpdate(update.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-sm whitespace-pre-wrap">{update.content}</p>
                {update.hasImage && (
                  <img
                    src={update.imageUrl || `${API_URL}/api/updates/${update.id}/image`}
                    alt=""
                    className="mt-3 max-w-full max-h-80 rounded-lg border border-[var(--border)]"
                  />
                )}
              </div>
            );
          })}
          {updates.length === 0 && (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-4">
              No updates posted yet.
            </p>
          )}
            </div>
          </>
        )}
      </div>

      {/* Files */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">Files</h2>
          <label className="px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg text-sm cursor-pointer hover:opacity-90">
            {uploading ? "Uploading..." : "Upload File"}
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        </div>

        <div className="space-y-2">
          {project.files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 border border-[var(--border)] rounded-lg"
            >
              <div>
                <p className="text-sm font-medium">{file.filename}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {formatBytes(file.sizeBytes)} &middot; {file.mimeType}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(file.id, file.filename)}
                  className="text-sm text-[var(--primary)] hover:underline"
                >
                  Download
                </button>
                <button
                  onClick={() => handleDeleteFile(file.id)}
                  className="text-sm text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {project.files.length === 0 && (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-4">
              No files uploaded yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
