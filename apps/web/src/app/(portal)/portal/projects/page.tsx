"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface Project {
  id: string;
  name: string;
  status: string;
  description?: string;
}

export default function PortalProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    apiFetch<Project[]>("/projects/mine").then(setProjects).catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Your Projects</h1>
      <div className="space-y-2">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/portal/projects/${project.id}`}
            className="block p-4 border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] transition-colors"
          >
            <h3 className="font-medium">{project.name}</h3>
            {project.description && (
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                {project.description}
              </p>
            )}
            <span className="inline-block mt-2 text-xs px-2 py-1 bg-[var(--muted)] rounded-full">
              {project.status.replace(/_/g, " ")}
            </span>
          </Link>
        ))}
        {projects.length === 0 && (
          <p className="text-[var(--muted-foreground)] text-center py-8">
            No projects assigned to you yet.
          </p>
        )}
      </div>
    </div>
  );
}
