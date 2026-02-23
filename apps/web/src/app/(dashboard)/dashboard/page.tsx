"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface Project {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    apiFetch<Project[]>("/projects").then(setProjects).catch(console.error);
  }, []);

  const recent = projects.slice(0, 5);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 border border-[var(--border)] rounded-lg">
          <p className="text-sm text-[var(--muted-foreground)]">
            Total Projects
          </p>
          <p className="text-3xl font-bold mt-1">{projects.length}</p>
        </div>
        <div className="p-4 border border-[var(--border)] rounded-lg">
          <p className="text-sm text-[var(--muted-foreground)]">In Progress</p>
          <p className="text-3xl font-bold mt-1">
            {projects.filter((p) => p.status === "in_progress").length}
          </p>
        </div>
        <div className="p-4 border border-[var(--border)] rounded-lg">
          <p className="text-sm text-[var(--muted-foreground)]">Completed</p>
          <p className="text-3xl font-bold mt-1">
            {projects.filter((p) => p.status === "completed").length}
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Recent Projects</h2>
          <Link
            href="/dashboard/projects"
            className="text-sm text-[var(--primary)] hover:underline"
          >
            View all
          </Link>
        </div>
        {recent.length > 0 ? (
          <div className="space-y-2">
            {recent.map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="block p-3 border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{project.name}</span>
                  <span className="text-xs px-2 py-1 bg-[var(--muted)] rounded-full">
                    {project.status.replace(/_/g, " ")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-[var(--muted-foreground)] text-sm">
            No projects yet.{" "}
            <Link
              href="/dashboard/projects"
              className="text-[var(--primary)] hover:underline"
            >
              Create your first project
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
