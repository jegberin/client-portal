"use client";

import { useEffect, useState, useCallback } from "react";
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
  files: FileRecord[];
}

interface ProjectUpdateRecord {
  id: string;
  content: string;
  imageUrl?: string;
  hasImage: boolean;
  author: { id: string; name: string };
  createdAt: string;
}

interface ProjectStatus {
  id: string;
  name: string;
  slug: string;
  color: string;
  order: number;
}

export default function PortalProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdateRecord[]>([]);

  const loadProject = useCallback(() => {
    apiFetch<Project>(`/projects/mine/${id}`).then(setProject).catch(console.error);
  }, [id]);

  const loadUpdates = useCallback(() => {
    apiFetch<ProjectUpdateRecord[]>(`/updates/mine/${id}`)
      .then(setUpdates)
      .catch(console.error);
  }, [id]);

  useEffect(() => {
    loadProject();
    loadUpdates();
    apiFetch<ProjectStatus[]>("/projects/statuses")
      .then(setStatuses)
      .catch(console.error);
  }, [loadProject, loadUpdates]);

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

  if (!project) return <div>Loading...</div>;

  // Find current status index for pipeline
  const currentIndex = statuses.findIndex(
    (s) => s.slug === project.status,
  );

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
        <h2 className="text-sm font-medium mb-3">Progress</h2>
        <div className="flex gap-1">
          {statuses.map((s, i) => (
            <div
              key={s.id}
              className="flex-1 text-center py-2 text-xs font-medium rounded"
              style={{
                backgroundColor:
                  i <= currentIndex ? s.color : "var(--muted)",
                color: i <= currentIndex ? "#fff" : "var(--muted-foreground)",
              }}
            >
              {s.name}
            </div>
          ))}
        </div>
      </div>

      {/* Updates */}
      <div>
        <h2 className="text-sm font-medium mb-3">Updates</h2>
        <div className="space-y-3">
          {updates.map((update) => {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            return (
              <div
                key={update.id}
                className="border border-[var(--border)] rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">{update.author.name}</span>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {formatRelativeTime(update.createdAt)}
                  </span>
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
              No updates shared yet.
            </p>
          )}
        </div>
      </div>

      {/* Files */}
      <div>
        <h2 className="text-sm font-medium mb-3">Files</h2>
        <div className="space-y-2">
          {project.files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 border border-[var(--border)] rounded-lg"
            >
              <div>
                <p className="text-sm font-medium">{file.filename}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {formatBytes(file.sizeBytes)}
                </p>
              </div>
              <button
                onClick={() => handleDownload(file.id, file.filename)}
                className="text-sm text-[var(--primary)] hover:underline"
              >
                Download
              </button>
            </div>
          ))}
          {project.files.length === 0 && (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-4">
              No files shared yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
